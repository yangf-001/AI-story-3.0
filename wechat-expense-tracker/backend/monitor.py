import subprocess
import re
import json
import time
import os
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
EXPENSES_FILE = DATA_DIR / "expenses.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

class WeChatExpenseMonitor:
    def __init__(self):
        self.is_monitoring = False
        self.expenses = []
        self.load_data()
    
    def load_data(self):
        if EXPENSES_FILE.exists():
            with open(EXPENSES_FILE, 'r', encoding='utf-8') as f:
                self.expenses = json.load(f)
        
        if not SETTINGS_FILE.exists():
            self.settings = {
                "monthly_budget": 5000,
                "daily_budget": 200,
                "categories": {
                    "餐饮": ["外卖", "餐厅", "奶茶", "咖啡", "零食"],
                    "交通": ["打车", "公交", "地铁", "停车", "加油"],
                    "购物": ["淘宝", "京东", "拼多多", "快递"],
                    "娱乐": ["电影", "游戏", "演唱会", "旅游"],
                    "生活": ["水电费", "房租", "话费", "医疗"],
                    "其他": []
                }
            }
            self.save_settings()
        else:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                self.settings = json.load(f)
    
    def save_settings(self):
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.settings, f, ensure_ascii=False, indent=2)
    
    def save_expenses(self):
        with open(EXPENSES_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.expenses, f, ensure_ascii=False, indent=2)
    
    def check_adb_connection(self):
        try:
            result = subprocess.run(['adb', 'devices'], capture_output=True, text=True, timeout=10)
            lines = result.stdout.strip().split('\n')[1:]
            devices = [line.split('\t')[0] for line in lines if line.strip()]
            return len(devices) > 0, devices
        except Exception as e:
            return False, [str(e)]
    
    def start_notification_listener(self):
        if not self.is_monitoring:
            connected, info = self.check_adb_connection()
            if not connected:
                return False, f"未检测到ADB设备连接。请确保手机已通过USB连接电脑并开启USB调试模式。\n\n详细信息: {info[0]}"
            
            self.is_monitoring = True
            return True, f"已连接设备: {info[0]}，开始监听微信支付通知..."
        return True, "已在监听中"
    
    def stop_notification_listener(self):
        self.is_monitoring = False
        return True, "已停止监听"
    
    def parse_wechat_notification(self, notification_text):
        patterns = [
            r"微信支付：.*?([-\u4e00-\u9fa5]+).*?收款.*?(\d+\.?\d*)元",
            r"微信支付.*?([-\u4e00-\u9fa5]+).*?支付.*?(\d+\.?\d*)元",
            r"您已成功支付.*?(\d+\.?\d*)元.*?([-\u4e00-\u9fa5]+)",
            r"支付.*?(\d+\.?\d*)元.*?([-\u4e00-\u9fa5]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, notification_text)
            if match:
                groups = match.groups()
                if len(groups) == 2:
                    if groups[0].isdigit() or groups[0].replace('.', '').isdigit():
                        amount = float(groups[0])
                        category = groups[1]
                    else:
                        amount = float(groups[1])
                        category = groups[0]
                    
                    category = self.auto_categorize(category, amount)
                    return {
                        "amount": amount,
                        "category": category,
                        "description": notification_text[:100],
                        "timestamp": datetime.now().isoformat()
                    }
        return None
    
    def auto_categorize(self, description, amount):
        desc = description.lower()
        categories = self.settings.get("categories", {})
        
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in desc:
                    return category
        
        if amount < 50:
            return "餐饮"
        elif amount < 200:
            return "购物"
        else:
            return "其他"
    
    def add_expense(self, amount, category, description=""):
        expense = {
            "id": len(self.expenses) + 1,
            "amount": float(amount),
            "category": category,
            "description": description,
            "timestamp": datetime.now().isoformat(),
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        self.expenses.append(expense)
        self.save_expenses()
        return expense
    
    def delete_expense(self, expense_id):
        self.expenses = [e for e in self.expenses if e.get("id") != expense_id]
        self.save_expenses()
        return True
    
    def get_statistics(self):
        if not self.expenses:
            return self._empty_stats()
        
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        month_start = now.replace(day=1).strftime("%Y-%m-%d")
        
        today_expenses = [e for e in self.expenses if e.get("date") == today]
        month_expenses = [e for e in self.expenses if e.get("date", "") >= month_start]
        
        stats = {
            "total": sum(e.get("amount", 0) for e in self.expenses),
            "today_total": sum(e.get("amount", 0) for e in today_expenses),
            "month_total": sum(e.get("amount", 0) for e in month_expenses),
            "expense_count": len(self.expenses),
            "today_count": len(today_expenses),
            "month_count": len(month_expenses),
            "daily_budget": self.settings.get("daily_budget", 200),
            "monthly_budget": self.settings.get("monthly_budget", 5000),
            "budget_remaining": self.settings.get("monthly_budget", 5000) - sum(e.get("amount", 0) for e in month_expenses),
            "daily_remaining": self.settings.get("daily_budget", 200) - sum(e.get("amount", 0) for e in today_expenses),
            "by_category": self._get_category_stats(month_expenses),
            "recent_expenses": sorted(self.expenses, key=lambda x: x.get("timestamp", ""), reverse=True)[:10],
            "daily_trend": self._get_daily_trend(month_expenses),
            "monthly_trend": self._get_monthly_trend(),
        }
        
        if stats["budget_remaining"] < 0:
            stats["budget_warning"] = f"本月预算已超出 {-stats['budget_remaining']} 元"
        elif stats["budget_remaining"] < self.settings.get("monthly_budget", 5000) * 0.2:
            stats["budget_warning"] = f"本月预算剩余不足20%"
        
        return stats
    
    def _get_category_stats(self, expenses):
        category_totals = {}
        for expense in expenses:
            cat = expense.get("category", "其他")
            category_totals[cat] = category_totals.get(cat, 0) + expense.get("amount", 0)
        
        total = sum(category_totals.values())
        result = []
        for cat, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            result.append({
                "category": cat,
                "amount": amount,
                "percentage": round(amount / total * 100, 1) if total > 0 else 0
            })
        return result
    
    def _get_daily_trend(self, expenses):
        daily = {}
        for expense in expenses:
            date = expense.get("date", "")
            if date:
                daily[date] = daily.get(date, 0) + expense.get("amount", 0)
        
        days = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
        return [{"date": d, "amount": daily.get(d, 0)} for d in days]
    
    def _get_monthly_trend(self):
        monthly = {}
        for expense in self.expenses:
            date = expense.get("date", "")
            if date:
                month = date[:7]
                monthly[month] = monthly.get(month, 0) + expense.get("amount", 0)
        
        months = [(datetime.now() - timedelta(days=30*i)).strftime("%Y-%m") for i in range(5, -1, -1)]
        return [{"month": m, "amount": monthly.get(m, 0)} for m in months]
    
    def _empty_stats(self):
        return {
            "total": 0, "today_total": 0, "month_total": 0,
            "expense_count": 0, "today_count": 0, "month_count": 0,
            "daily_budget": self.settings.get("daily_budget", 200),
            "monthly_budget": self.settings.get("monthly_budget", 5000),
            "budget_remaining": self.settings.get("monthly_budget", 5000),
            "daily_remaining": self.settings.get("daily_budget", 200),
            "by_category": [], "recent_expenses": [],
            "daily_trend": [], "monthly_trend": []
        }
    
    def update_settings(self, new_settings):
        self.settings.update(new_settings)
        self.save_settings()
        return self.settings

monitor = WeChatExpenseMonitor()
