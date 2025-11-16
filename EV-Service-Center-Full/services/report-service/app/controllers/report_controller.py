# File: services/report-service/controllers/report_controller.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request
from functools import wraps
from services.report_service import ReportService as service

report_bp = Blueprint("report", __name__, url_prefix="/api/reports")

# --- Decorators (Sao chép Admin Required) ---
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                if claims.get("role") == "admin":
                    return fn(*args, **kwargs)
                else:
                    return jsonify(error="Admins only!"), 403
            except Exception:
                return jsonify(error="Token invalid or missing."), 401
        return decorator
    return wrapper

# --- Routes ---

# 1. ADMIN: GENERATE REPORT (POST /api/reports/generate/finance)
@report_bp.route("/generate/finance", methods=["POST"])
@jwt_required()
@admin_required()
def generate_finance_report_route():
    data = request.json
    from_date = data.get("from_date")
    to_date = data.get("to_date")

    if not from_date or not to_date:
        return jsonify({"error": "Thiếu from_date hoặc to_date"}), 400
    
    report, report_data, error = service.generate_finance_report(from_date, to_date)
    
    if error:
        return jsonify({"error": error}), 400

    return jsonify({
        "message": "Báo cáo tài chính đã được tạo thành công.",
        "report_record": report.to_dict(),
        "report_data": report_data
    }), 201

# 2. ADMIN: GET ALL REPORTS (GET /api/reports/)
@report_bp.route("/", methods=["GET"])
@jwt_required()
@admin_required()
def get_all_reports_route():
    reports = service.get_all_reports()
    return jsonify([r.to_dict() for r in reports]), 200

# 3. ADMIN: GET REPORT BY ID (GET /api/reports/<id>)
@report_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
@admin_required()
def get_report_details_route(report_id):
    report = service.get_report_by_id(report_id)
    
    if not report:
        return jsonify({"error": "Không tìm thấy Bản ghi Báo cáo."}), 404

    return jsonify(report.to_dict()), 200