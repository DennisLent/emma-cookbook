from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def error_response(*, code: str, message: str, http_status: int, details=None):
    return Response(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            }
        },
        status=http_status,
    )


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    view_name = context.get("view").__class__.__name__ if context.get("view") else "unknown_view"
    status_code = response.status_code

    if isinstance(response.data, dict):
        message = response.data.get("detail") or "Request failed."
        details = {k: v for k, v in response.data.items() if k != "detail"}
    else:
        message = "Request failed."
        details = {"errors": response.data}

    code = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "unsupported_media_type",
        status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    }.get(status_code, "request_failed")

    # Expose the originating view to make frontend debugging clearer in development.
    details = {"view": view_name, **details}

    response.data = {
        "error": {
            "code": code,
            "message": str(message),
            "details": details,
        }
    }
    return response
