import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import threading
import time
import subprocess
import queue
import json
from monitor import monitor

app = Flask(__name__, static_folder='../frontend')
CORS(app)

notification_queue = queue.Queue()
monitoring_thread = None

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/api/status')
def get_status():
    connected, devices = monitor.check_adb_connection()
    return jsonify({
        "monitoring": monitor.is_monitoring,
        "adb_connected": connected,
        "devices": devices,
        "expense_count": len(monitor.expenses)
    })

@app.route('/api/start-monitor', methods=['POST'])
def start_monitor():
    success, message = monitor.start_notification_listener()
    return jsonify({"success": success, "message": message})

@app.route('/api/stop-monitor', methods=['POST'])
def stop_monitor():
    success, message = monitor.stop_notification_listener()
    return jsonify({"success": success, "message": message})

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    all_expenses = sorted(monitor.expenses, key=lambda x: x.get("timestamp", ""), reverse=True)
    start = (page - 1) * limit
    end = start + limit
    
    return jsonify({
        "expenses": all_expenses[start:end],
        "total": len(all_expenses),
        "page": page,
        "limit": limit
    })

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.get_json(silent=True) or {}
    amount = float(data.get('amount', 0)) if data.get('amount') else 0
    expense = monitor.add_expense(
        amount=amount,
        category=data.get('category', '其他'),
        description=data.get('description', '')
    )
    return jsonify({"success": True, "expense": expense})

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    monitor.delete_expense(expense_id)
    return jsonify({"success": True})

@app.route('/api/statistics')
def get_statistics():
    return jsonify(monitor.get_statistics())

@app.route('/api/settings')
def get_settings():
    return jsonify(monitor.settings)

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    data = request.get_json(silent=True) or {}
    settings = monitor.update_settings(data)
    return jsonify({"success": True, "settings": settings})

@app.route('/api/parse-notification', methods=['POST'])
def parse_notification():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = monitor.parse_wechat_notification(text)
    if result:
        expense = monitor.add_expense(
            amount=result['amount'],
            category=result['category'],
            description=result['description']
        )
        return jsonify({"success": True, "expense": expense, "parsed": result})
    return jsonify({"success": False, "message": "无法解析该通知"})

def listen_notifications():
    while monitor.is_monitoring:
        try:
            result = subprocess.run(
                ['adb', 'shell', 'appops', 'get', 'com.tencent.mm', 'android.permission#NOTIFICATION_LISTENER'],
                capture_output=True, text=True, timeout=5
            )
            
            subprocess.run(
                ['adb', 'shell', 'dumpsys', 'notification', '--noredact'],
                capture_output=True, text=True, timeout=10
            )
            
            time.sleep(3)
        except Exception as e:
            time.sleep(5)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
