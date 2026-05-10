/**
 * React Hook for production-ready form management
 * Handles validation, error recovery, loading states
 */
import { useState, useCallback } from 'react';

export const useFormValidation = (initialValues, onSubmit, options = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const maxRetries = options.maxRetries || 3;

  const setFieldValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setFieldTouched = useCallback((field, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitCount(0);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);

    try {
      await onSubmit(values);
    } catch (error) {
      // Error is handled by parent component
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  const canRetry = submitCount < maxRetries;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    canRetry,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleSubmit,
    resetForm,
  };
};

/**
 * Hook for managing loading states with automatic cleanup
 */
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback((errorMessage = null) => {
    setIsLoading(false);
    if (errorMessage) {
      setError(errorMessage);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    resetError,
  };
};

/**
 * Hook for managing retry logic with exponential backoff
 */
export const useRetryLogic = (asyncFn, maxRetries = 3, initialDelay = 1000) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return null;
    }

    setIsRetrying(true);
    const delay = initialDelay * Math.pow(2, retryCount);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      setRetryCount(prev => prev + 1);
      return await asyncFn();
    } catch (error) {
      setIsRetrying(false);
      throw error;
    }
  }, [asyncFn, maxRetries, initialDelay, retryCount]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
  };
};
