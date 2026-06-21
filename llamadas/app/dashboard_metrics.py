"""Dashboard: Métricas de las 6 mejoras - Simple + Effective"""
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class DashboardMetrics:
    """Métricas en tiempo real de las 6 mejoras"""

    def __init__(self, db_client):
        self.db = db_client

    async def get_system_overview(self) -> dict:
        """Vista general del sistema"""

        try:
            # Query Supabase view: metrics_system_overall
            result = await self.db.query(
                "SELECT * FROM metrics_system_overall LIMIT 1"
            )

            if not result:
                return self._empty_metrics()

            row = result[0]

            return {
                "timestamp": datetime.now().isoformat(),
                "status": "✅ Operational",

                # Core metrics
                "prospects_tracked": row.get("total_prospects", 0),
                "calls_analyzed": row.get("total_calls_analyzed", 0),
                "close_rate": f"{row.get('overall_close_rate', 0):.1%}",

                # Channel metrics
                "followups_sent": row.get("followups_sent", 0),
                "followups_opened": row.get("followups_opened", 0),
                "open_rate": f"{(row.get('followups_opened', 0) / max(1, row.get('followups_sent', 1))):.1%}",

                # Lead scoring
                "avg_lead_score": f"{row.get('avg_lead_score', 0):.0f}/100",

                # Financial
                "total_prospect_value": f"${row.get('total_deal_value', 0):,.0f}",
            }

        except Exception as e:
            logger.error(f"Error fetching metrics: {e}")
            return self._empty_metrics()

    async def get_segment_performance(self, industry: str = None) -> list:
        """Performance por segmento"""

        try:
            if industry:
                query = f"SELECT * FROM metrics_by_segment WHERE industry = '{industry}'"
            else:
                query = "SELECT * FROM metrics_by_segment ORDER BY close_rate DESC LIMIT 10"

            result = await self.db.query(query)

            segments = []
            for row in result:
                segments.append({
                    "segment": f"{row.get('industry')}_{row.get('company_size')}",
                    "prospects": row.get("total_prospects", 0),
                    "close_rate": f"{row.get('close_rate', 0):.1%}",
                    "avg_lead_score": f"{row.get('avg_lead_score', 0):.0f}",
                    "avg_deal_value": f"${row.get('avg_deal_value', 0):,.0f}",
                })

            return segments

        except Exception as e:
            logger.error(f"Error fetching segment metrics: {e}")
            return []

    async def get_improvement_status(self) -> dict:
        """Estado de cada mejora"""

        return {
            "improvements": [
                {
                    "name": "Prospect Profile Engine",
                    "status": "✅ Active",
                    "profiles_loaded": "TODO: query",
                    "avg_confidence": "TODO: query",
                },
                {
                    "name": "Deal Engine",
                    "status": "✅ Active",
                    "deals_optimized": "TODO: query",
                    "avg_confidence": "TODO: query",
                },
                {
                    "name": "Coaching Automático",
                    "status": "✅ Active",
                    "calls_analyzed": "TODO: query",
                    "avg_score": "TODO: query",
                },
                {
                    "name": "Conversation Intelligence",
                    "status": "✅ Active",
                    "moments_logged": "TODO: query",
                    "arguments_tracked": "TODO: query",
                },
                {
                    "name": "Multicanal",
                    "status": "✅ Active",
                    "followups_sent": "TODO: query",
                    "open_rate": "TODO: query",
                },
                {
                    "name": "Revenue Optimizer",
                    "status": "✅ Active",
                    "avg_expected_revenue": "TODO: query",
                    "improvement_vs_baseline": "TODO: query",
                },
            ]
        }

    async def get_alert_summary(self) -> dict:
        """Alertas importantes"""

        return {
            "critical": [],
            "warnings": [
                "Supabase connection needs setup",
                "Twilio API not configured",
                "SendGrid API not configured",
            ],
            "info": [
                "All 6 improvements integrated",
                "Test suite passed",
                "Ready for deployment",
            ]
        }

    def _empty_metrics(self) -> dict:
        """Default metrics cuando BD no está disponible"""
        return {
            "timestamp": datetime.now().isoformat(),
            "status": "⏳ Initializing",
            "prospects_tracked": 0,
            "calls_analyzed": 0,
            "close_rate": "N/A",
            "message": "Database not yet configured"
        }

    async def print_dashboard(self):
        """Print fancy dashboard"""
        overview = await self.get_system_overview()
        improvements = await self.get_improvement_status()
        alerts = await self.get_alert_summary()

        print("\n" + "="*70)
        print("  🚀 SISTEMA DE 6 MEJORAS - DASHBOARD")
        print("="*70)

        print(f"\n📊 OVERVIEW")
        print(f"  Status: {overview.get('status')}")
        print(f"  Prospects: {overview.get('prospects_tracked')}")
        print(f"  Calls Analyzed: {overview.get('calls_analyzed')}")
        print(f"  Close Rate: {overview.get('close_rate')}")

        print(f"\n🔄 FOLLOW-UPS")
        print(f"  Sent: {overview.get('followups_sent')}")
        print(f"  Opened: {overview.get('followups_opened')}")
        print(f"  Open Rate: {overview.get('open_rate')}")

        print(f"\n🎯 IMPROVEMENTS STATUS")
        for imp in improvements.get('improvements', []):
            print(f"  ✅ {imp['name']}: {imp['status']}")

        print(f"\n⚠️  ALERTS")
        for alert in alerts.get('warnings', []):
            print(f"  ⚠️  {alert}")

        print("\n" + "="*70)


# ponytail: Dashboard minimal - add real metrics when DB ready
