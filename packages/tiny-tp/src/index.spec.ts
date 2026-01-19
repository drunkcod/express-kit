import { jest, describe, it, expect } from '@jest/globals';
import { parseTraceparent, tracingMiddleware, getTraceContext, getTraceHeaders } from './index.js';
import type { Request, Response, NextFunction } from 'express';
import { IdGenerator } from './IdGenerator.js';

describe('IdGenerator', () => {
	it('should generate 16-byte trace IDs (32 hex chars)', () => {
		const gen = new IdGenerator();
		const traceId = gen.newTrace();
		expect(traceId).toMatch(/^[0-9a-f]{32}$/);
	});

	it('should generate 8-byte span IDs (16 hex chars)', () => {
		const gen = new IdGenerator();
		const spanId = gen.newSpan();
		expect(spanId).toMatch(/^[0-9a-f]{16}$/);
	});

	it('should generate unique IDs', () => {
		const gen = new IdGenerator();
		const id1 = gen.newTrace();
		const id2 = gen.newTrace();
		expect(id1).not.toBe(id2);
	});
});

describe('tiny-tp', () => {
	describe('parseTracparent', () => {
		it('should parse a valid traceparent header', () => {
			const valid = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
			const result = parseTraceparent(valid);
			expect(result).toEqual({
				traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
				parentId: '00f067aa0ba902b7',
				sampled: true,
			});
		});

		it('should return undefined for invalid version', () => {
			const invalid = '01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
			expect(parseTraceparent(invalid)).toBeUndefined();
		});

		it('should return undefined for malformed format', () => {
			expect(parseTraceparent('invalid-header')).toBeUndefined();
		});

		it('should handle unsampled flag', () => {
			const unsampled = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00';
			const result = parseTraceparent(unsampled);
			expect(result?.sampled).toBe(false);
		});
	});

	describe('tracingMiddleware', () => {
		// Mock Express objects
		const mockReq = (headers: Record<string, string> = {}) => ({ headers }) as unknown as Request;
		const mockRes = () => {
			const headers: Record<string, string> = {};
			return {
				setHeader: jest.fn((k: string, v: string) => {
					headers[k] = v;
				}),
				getHeader: (k: string) => headers[k],
				// helper to check headers in test
				_headers: headers,
			} as unknown as Response & { _headers: Record<string, string> };
		};

		it('should start a new trace if no header is present', () => {
			const req = mockReq();
			const res = mockRes();
			const next = jest.fn(() => {
				const ctx = getTraceContext();
				expect(ctx).toBeDefined();
				expect(ctx?.traceId).toMatch(/^[0-9a-f]{32}$/);
				expect(ctx?.spanId).toMatch(/^[0-9a-f]{16}$/);
				expect(ctx?.sampled).toBe(true);
			}) as unknown as NextFunction;

			tracingMiddleware(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(res.setHeader).toHaveBeenCalledWith('traceparent', expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/));
		});

		it('should continue an existing trace', () => {
			const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
			const parentSpanId = '00f067aa0ba902b7';
			const header = `00-${traceId}-${parentSpanId}-01`;

			const req = mockReq({ traceparent: header });
			const res = mockRes();
			const next = jest.fn(() => {
				const ctx = getTraceContext();
				expect(ctx?.traceId).toBe(traceId);
				expect(ctx?.parentId).toBe(parentSpanId);
				expect(ctx?.spanId).not.toBe(parentSpanId); // Should be a new span
			}) as unknown as NextFunction;

			tracingMiddleware(req, res, next);

			expect(next).toHaveBeenCalled();
			// Response should have the SAME traceId but the NEW spanId
			const responseHeader = res._headers['traceparent'];
			const parts = responseHeader.split('-');
			expect(parts[1]).toBe(traceId);
			expect(parts[2]).not.toBe(parentSpanId);
		});

		it('should propagate tracestate', () => {
			const tracestate = 'rojo=00f067aa0ba902b7';
			const req = mockReq({ traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01', tracestate });
			const res = mockRes();
			const next = jest.fn(() => {
				const ctx = getTraceContext();
				expect(ctx?.traceState).toBe(tracestate);
			}) as unknown as NextFunction;

			tracingMiddleware(req, res, next);

			expect(res.setHeader).toHaveBeenCalledWith('tracestate', tracestate);
		});

		it('supports configurable sampling rate', () => {
			const req = mockReq();
			const res = mockRes();
			const next = jest.fn() as unknown as NextFunction;

			// 0 sampling rate -> never sample
			const mw = tracingMiddleware({ samplingRate: 0 });
			mw(req, res, next);

			expect(res.setHeader).toHaveBeenCalledWith('traceparent', expect.stringMatching(/-00$/)); // ends with 00 (not sampled)
		});
	});

	describe('helpers', () => {
		const mockReq = (headers: Record<string, string> = {}) => ({ headers }) as unknown as Request;
		const mockRes = () => ({ setHeader: jest.fn() }) as unknown as Response;

		it('should include tracestate in trace headers', () => {
			const tracestate = 'foo=bar';
			const req = mockReq({ traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01', tracestate });
			const res = mockRes();

			let headers;
			tracingMiddleware(req, res, () => {
				headers = getTraceHeaders();
			});

			expect(headers).toHaveProperty('tracestate', tracestate);
		});
	});
});
