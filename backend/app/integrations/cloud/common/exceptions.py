"""
Step 18 Cloud Integration Exceptions.
"""


class CloudError(Exception):
    """Base exception for all cloud operations."""
    def __init__(self, message: str, provider: str = "UNKNOWN", error_code: str = "CLOUD_ERROR"):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.error_code = error_code


class CloudAuthenticationError(CloudError):
    def __init__(self, message: str, provider: str = "UNKNOWN"):
        super().__init__(message, provider=provider, error_code="AUTHENTICATION_FAILED")


class CloudAuthorizationError(CloudError):
    def __init__(self, message: str, provider: str = "UNKNOWN"):
        super().__init__(message, provider=provider, error_code="AUTHORIZATION_FAILED")


class CloudThrottledError(CloudError):
    def __init__(self, message: str, provider: str = "UNKNOWN", retry_after_seconds: float = 5.0):
        super().__init__(message, provider=provider, error_code="THROTTLED")
        self.retry_after_seconds = retry_after_seconds


class CloudResourceNotFoundError(CloudError):
    def __init__(self, resource_id: str, provider: str = "UNKNOWN"):
        super().__init__(f"Resource {resource_id} not found in {provider}", provider=provider, error_code="RESOURCE_NOT_FOUND")
        self.resource_id = resource_id


class OperationNotSupportedError(CloudError):
    def __init__(self, operation: str, provider: str = "UNKNOWN"):
        super().__init__(f"Operation {operation} not supported for provider {provider}", provider=provider, error_code="CLOUD_OPERATION_NOT_SUPPORTED")
        self.operation = operation
