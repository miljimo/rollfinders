import re
import unittest
from pathlib import Path


NOTIFICATION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = NOTIFICATION_ROOT.parents[1]

OWNED_NOTIFICATION_TABLES = {
    "notifications",
    "email_messages",
    "email_recipients",
    "notification_attachments",
    "notification_attempts",
}

REQUIRED_RUNBOOK_GATES = {
    "create and idempotency": ["POST /notifications", "idempotency"],
    "retry schedule": ["Attempt 2: 1 minute", "Attempt 3: 5 minutes", "Attempt 4: 15 minutes", "Attempt 5: 1 hour"],
    "queue locking": ["FOR UPDATE SKIP LOCKED", "single worker ownership"],
    "fake SMTP": ["fake SMTP", "live provider calls disabled"],
    "search and details": ["GET /notifications", "GET /notifications/{notificationId}"],
    "business integration": ["Booking Service", "opaque metadata"],
    "data ownership": ["notification tables", "services/notification/migrations"],
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def all_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(path for path in root.rglob("*") if path.is_file())


def sql_files(root: Path) -> list[Path]:
    return [path for path in all_files(root) if path.suffix.lower() == ".sql"]


def normalize_sql(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower())


class NotificationRegressionScaffoldingTests(unittest.TestCase):
    def test_ticket_010_runbook_covers_required_regression_gates(self) -> None:
        runbook = NOTIFICATION_ROOT / "docs" / "ticket010-regression-runbook.md"
        self.assertTrue(runbook.exists(), "expected ticket 010 regression runbook")

        content = read_text(runbook)
        for gate, required_terms in REQUIRED_RUNBOOK_GATES.items():
            with self.subTest(gate=gate):
                for term in required_terms:
                    self.assertIn(term, content)

    def test_notification_table_ownership_stays_in_notification_migrations(self) -> None:
        migration_files = [
            path
            for service_root in (REPO_ROOT / "services").iterdir()
            if service_root.is_dir()
            for path in sql_files(service_root / "migrations")
        ]
        self.assertTrue(migration_files, "expected service migration files to scan")

        ownership_violations: list[str] = []
        mutating_statement = re.compile(
            r"\b(create\s+table|alter\s+table|drop\s+table|truncate\s+table|insert\s+into|update|delete\s+from)\s+"
            r"(?:if\s+(?:not\s+)?exists\s+)?"
            r"(?:notification\.)?"
            r"(notifications|email_messages|email_recipients|notification_attachments|notification_attempts)\b",
            re.IGNORECASE,
        )

        for path in migration_files:
            relative = path.relative_to(REPO_ROOT).as_posix()
            if relative.startswith("services/notification/migrations/"):
                continue

            sql = normalize_sql(read_text(path))
            if mutating_statement.search(sql):
                ownership_violations.append(relative)

        self.assertEqual(
            [],
            ownership_violations,
            "notification persistence tables must be managed only by services/notification/migrations",
        )

    def test_prd_and_ticket_define_tables_before_executable_db_tests_land(self) -> None:
        source_docs = [
            NOTIFICATION_ROOT / "docs" / "product.md",
            NOTIFICATION_ROOT
            / "docs"
            / "Feature"
            / "Tickets"
            / "Refinement"
            / "ticket003NotificationDatabaseSchema.md",
        ]

        for doc in source_docs:
            self.assertTrue(doc.exists(), f"missing source document {doc}")
            content = read_text(doc)
            for table in OWNED_NOTIFICATION_TABLES:
                with self.subTest(doc=doc.name, table=table):
                    self.assertIn(table, content)

    def test_retry_schedule_contract_is_pinned(self) -> None:
        product = read_text(NOTIFICATION_ROOT / "docs" / "product.md")
        ticket = read_text(
            NOTIFICATION_ROOT
            / "docs"
            / "Feature"
            / "Tickets"
            / "Refinement"
            / "ticket007QueueWorkerAndRetryProcessing.md"
        )
        combined = f"{product}\n{ticket}"

        for expected in ["Attempt 1 Immediate", "Attempt 2 1 Minute", "Attempt 3 5 Minutes", "Attempt 4 15 Minutes", "Attempt 5 1 Hour"]:
            self.assertIn(expected, combined)
        self.assertIn("Maximum Attempts:\n\n```text\n5", product)


if __name__ == "__main__":
    unittest.main()
