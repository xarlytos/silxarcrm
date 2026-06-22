import express from 'express';
import {
  apiLatencyHistogram,
  apiRequestsCounter,
  apiErrorsCounter,
} from '../utils/metrics';

export function metricsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = Date.now();
  const endpoint = req.route?.path || req.path;

  // Track the original end function
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Record metrics
    apiLatencyHistogram
      .labels(endpoint, req.method, String(statusCode))
      .observe(duration);

    apiRequestsCounter
      .labels(endpoint, req.method, String(statusCode))
      .inc();

    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      apiErrorsCounter
        .labels(endpoint, errorType, String(statusCode))
        .inc();
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}
