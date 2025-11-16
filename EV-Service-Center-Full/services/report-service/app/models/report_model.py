from app import db 
from sqlalchemy import func

# Định nghĩa các loại báo cáo
REPORT_TYPES = db.Enum(
    "finance_summary", "maintenance_performance", "inventory_low_stock", 
    name="report_types"
)

class ReportRecord(db.Model):
    __tablename__ = "report_records"

    id = db.Column(db.Integer, primary_key=True, index=True)
    report_type = db.Column(
        REPORT_TYPES,
        nullable=False
    )
    # Metadata lưu trữ các tham số tạo báo cáo (VD: from_date, to_date)
    metadata_json = db.Column(db.Text, nullable=True) 
    # Link tới file báo cáo đã được tạo (nếu lưu file)
    file_url = db.Column(db.String(255), nullable=True)
    # Trạng thái báo cáo: pending, generated, failed
    status = db.Column(db.String(50), nullable=False, default="generated")
    
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    
    def to_dict(self):
        """Chuyển đổi đối tượng sang dictionary để trả về API"""
        return {
            "id": self.id,
            "report_type": str(self.report_type),
            "metadata": self.metadata_json,
            "file_url": self.file_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }