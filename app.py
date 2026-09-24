import os
import uuid
from collections import Counter
from datetime import datetime
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder='templates', static_folder='static')

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

app.config['SECRET_KEY'] = 'invisible-campus-secret-key-2026'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'database.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

db = SQLAlchemy(app)

# ---------------------------------------------------------
# DATABASE MODEL
# ---------------------------------------------------------
class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    building = db.Column(db.String(100), nullable=False)
    room = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), nullable=False, default='Pending')  # Pending, In Progress, Resolved
    assigned_team = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'building': self.building,
            'room': self.room,
            'description': self.description,
            'image_path': f"/uploads/{self.image_path}" if self.image_path else None,
            'status': self.status,
            'assigned_team': self.assigned_team,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else ''
        }

# ---------------------------------------------------------
# UTILITY FUNCTIONS & OPENCV CATEGORY SUGGESTION
# ---------------------------------------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def suggest_issue_category_cv(file_bytes):
    """
    Computer Vision heuristic to suggest an issue category based on image features.
    Provides non-intrusive recommendation; manual selection remains primary.
    """
    try:
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return "Other", "Image could not be parsed."

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        avg_brightness = np.mean(gray)

        # Blue range for Plumbing / Water leaks
        lower_blue = np.array([90, 50, 50])
        upper_blue = np.array([130, 255, 255])
        blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
        blue_ratio = np.sum(blue_mask > 0) / (img.shape[0] * img.shape[1])

        # Brown / Orange range for Wooden Furniture
        lower_brown = np.array([10, 50, 20])
        upper_brown = np.array([25, 255, 200])
        brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
        brown_ratio = np.sum(brown_mask > 0) / (img.shape[0] * img.shape[1])

        if blue_ratio > 0.12:
            return "Plumbing", "Computer Vision detected water/moisture color spectrum."
        elif brown_ratio > 0.15:
            return "Furniture", "Computer Vision detected wood/furniture color tones."
        elif variance > 300 and avg_brightness < 180:
            return "Civil / Structural", "Computer Vision detected high edge density & structural texture."
        elif avg_brightness < 60 or avg_brightness > 220:
            return "Electrical", "Computer Vision detected lighting/electrical contrast signatures."
        else:
            return "Cleanliness", "Computer Vision suggested general campus issue."
    except Exception as e:
        print(f"OpenCV Analysis Warning: {e}")
        return "Other", "Default heuristic active."

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ---------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------
@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    file_bytes = file.read()
    suggested_category, explanation = suggest_issue_category_cv(file_bytes)
    
    return jsonify({
        'suggested_category': suggested_category,
        'explanation': explanation
    })

@app.route('/api/reports', methods=['POST'])
def create_report():
    category = request.form.get('category')
    building = request.form.get('building')
    room = request.form.get('room', '').strip()
    description = request.form.get('description', '').strip()

    if not category or not building or not description:
        return jsonify({'error': 'Category, Building, and Description are required fields.'}), 400

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            unique_name = f"{uuid.uuid4().hex[:10]}_{secure_filename(file.filename)}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(file_path)
            image_filename = unique_name

    new_report = Report(
        category=category,
        building=building,
        room=room or 'N/A',
        description=description,
        image_path=image_filename,
        status='Pending'
    )

    db.session.add(new_report)
    db.session.commit()

    return jsonify({
        'message': 'Report submitted successfully!',
        'report': new_report.to_dict()
    }), 201

@app.route('/api/reports', methods=['GET'])
def get_reports():
    building_filter = request.args.get('building')
    status_filter = request.args.get('status')

    query = Report.query
    if building_filter:
        query = query.filter_by(building=building_filter)
    if status_filter:
        query = query.filter_by(status=status_filter)

    reports = query.order_by(Report.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reports])

@app.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    return jsonify(report.to_dict())

@app.route('/api/reports/<int:report_id>', methods=['PUT'])
def update_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    data = request.get_json() or {}
    
    if 'status' in data:
        if data['status'] in ['Pending', 'In Progress', 'Resolved']:
            report.status = data['status']
        else:
            return jsonify({'error': 'Invalid status value.'}), 400

    if 'assigned_team' in data:
        report.assigned_team = data['assigned_team']

    report.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': 'Report updated successfully',
        'report': report.to_dict()
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total = Report.query.count()
    pending = Report.query.filter_by(status='Pending').count()
    in_progress = Report.query.filter_by(status='In Progress').count()
    resolved = Report.query.filter_by(status='Resolved').count()

    return jsonify({
        'total': total,
        'pending': pending,
        'in_progress': in_progress,
        'resolved': resolved
    })

@app.route('/api/hotspots', methods=['GET'])
def get_hotspots():
    """
    Recurring hotspot detection logic:
    Groups reports by building. Any building with >= 2 reports is classified as an Emerging Hotspot.
    """
    reports = Report.query.all()
    building_map = {}

    for r in reports:
        b = r.building
        if b not in building_map:
            building_map[b] = {
                'building': b,
                'total_reports': 0,
                'pending': 0,
                'in_progress': 0,
                'resolved': 0,
                'cat_list': [],
                'latest_report': None,
                'reports': []
            }
        
        bm = building_map[b]
        bm['total_reports'] += 1
        if r.status == 'Pending':
            bm['pending'] += 1
        elif r.status == 'In Progress':
            bm['in_progress'] += 1
        elif r.status == 'Resolved':
            bm['resolved'] += 1

        bm['cat_list'].append(r.category)
        bm['reports'].append(r.to_dict())
        if bm['latest_report'] is None or r.created_at > datetime.strptime(bm['latest_report']['created_at'], '%Y-%m-%d %H:%M:%S'):
            bm['latest_report'] = r.to_dict()

    hotspots = []
    for b, data in building_map.items():
        if data['total_reports'] >= 2:
            cat_counts = Counter(data['cat_list'])
            dominant_cat = cat_counts.most_common(1)[0][0] if cat_counts else 'General'
            data['dominant_category'] = dominant_cat
            data['categories'] = list(set(data['cat_list']))
            del data['cat_list']
            hotspots.append(data)

    hotspots.sort(key=lambda x: x['total_reports'], reverse=True)

    return jsonify({
        'hotspots': hotspots,
        'count': len(hotspots)
    })

@app.route('/api/buildings/<string:building_name>', methods=['GET'])
def get_building_info(building_name):
    reports = Report.query.filter_by(building=building_name).order_by(Report.created_at.desc()).all()
    report_count = len(reports)
    is_hotspot = report_count >= 2

    pending_count = sum(1 for r in reports if r.status == 'Pending')
    in_progress_count = sum(1 for r in reports if r.status == 'In Progress')
    resolved_count = sum(1 for r in reports if r.status == 'Resolved')

    cat_counts = Counter(r.category for r in reports)
    dominant_category = cat_counts.most_common(1)[0][0] if cat_counts else 'None'

    return jsonify({
        'building': building_name,
        'report_count': report_count,
        'is_hotspot': is_hotspot,
        'pending_count': pending_count,
        'in_progress_count': in_progress_count,
        'resolved_count': resolved_count,
        'dominant_category': dominant_category,
        'reports': [r.to_dict() for r in reports]
    })

# ---------------------------------------------------------
# INITIAL DATABASE SETUP
# ---------------------------------------------------------
def init_db():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    init_db()
    print("Invisible Campus server running at http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
