from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from cookbook.api_errors import error_response
from cookbook.db_backup import export_backup_data, import_backup_data
from .models import User
from .serializers import UserRegisterSerializer, UserSerializer

class UserRegisterView(generics.CreateAPIView):
    """
    POST /api/users/  
    Creates a new user (username, first_name, last_name, password)
    Optionally add: (bio, avatar, preferences).
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET  /api/users/me/   → retrieve current user’s profile  
    PUT  /api/users/me/   → replace entire profile (except username)  
    PATCH /api/users/me/  → partial update  
    DELETE /api/users/me/ → delete the current user
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DatabaseExportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, _request):
        backup_bytes = export_backup_data()
        response = HttpResponse(backup_bytes, content_type="application/json")
        response["Content-Disposition"] = 'attachment; filename="cookbook-backup.json"'
        return response


class DatabaseImportView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return error_response(
                code="missing_backup_file",
                message="A backup JSON file is required.",
                http_status=status.HTTP_400_BAD_REQUEST,
                details={"field": "file"},
            )

        try:
            counts = import_backup_data(uploaded_file.read())
        except ValueError as exc:
            return error_response(
                code="invalid_backup_file",
                message="The uploaded backup file is not valid.",
                http_status=status.HTTP_400_BAD_REQUEST,
                details={"reason": str(exc)},
            )
        except Exception as exc:
            return error_response(
                code="backup_import_failed",
                message="The backend could not import the uploaded backup.",
                http_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                details={"reason": str(exc)},
            )

        return Response({"status": "ok", "counts": counts}, status=status.HTTP_200_OK)
