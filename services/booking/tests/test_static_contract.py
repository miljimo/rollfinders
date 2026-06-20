import re
import unittest
from pathlib import Path


BOOKING_ROOT = Path(__file__).resolve().parents[1]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def all_text_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return [path for path in root.rglob("*") if path.is_file()]


def sql_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(path for path in root.rglob("*.sql") if path.is_file())


def joined_file_text(paths: list[Path]) -> str:
    return "\n".join(read_text(path) for path in paths)


def has_any_file(paths: list[Path], *needles: str) -> bool:
    lowered_needles = [needle.lower() for needle in needles]
    for path in paths:
        text = read_text(path).lower()
        if all(needle in text for needle in lowered_needles):
            return True
    return False


def is_camel_case(name: str) -> bool:
    return bool(re.fullmatch(r"[a-z][A-Za-z0-9]*", name)) and "_" not in name


class BookingSkeletonContractTests(unittest.TestCase):
    def test_required_service_skeleton_artifacts_exist(self) -> None:
        expected_paths = [
            "go.mod",
            "cmd/api",
            "internal/config",
            "internal/handlers",
            "internal/server",
            "internal/dataaccess",
            "internal/databases",
            "internal/environments",
            "Dockerfile",
            ".dockerignore",
            "compose.yml",
        ]

        missing = [path for path in expected_paths if not (BOOKING_ROOT / path).exists()]

        self.assertEqual([], missing)

    def test_health_and_ready_routes_are_declared(self) -> None:
        files = all_text_files(BOOKING_ROOT / "internal")
        self.assertTrue(files, "expected booking internal package files to exist")
        source = joined_file_text(files)

        self.assertIn("/healthz", source)
        self.assertIn("/readyz", source)

    def test_protected_routes_have_stable_unauthorized_error(self) -> None:
        files = all_text_files(BOOKING_ROOT / "internal")
        self.assertTrue(files, "expected booking internal package files to exist")
        source = joined_file_text(files).lower()

        self.assertIn("unauthorized", source)
        self.assertIn('json:"code"', source)
        self.assertIn('json:"message"', source)


class BookingOpenApiContractTests(unittest.TestCase):
    def openapi_files(self) -> list[Path]:
        candidates = [
            BOOKING_ROOT / "docs" / "api",
            BOOKING_ROOT / "docs" / "openapi",
            BOOKING_ROOT / "api",
        ]
        files: list[Path] = []
        for root in candidates:
            files.extend(
                path
                for path in all_text_files(root)
                if path.suffix.lower() in {".yaml", ".yml", ".json"}
            )
        return files

    def test_openapi_contract_artifact_exists(self) -> None:
        self.assertTrue(self.openapi_files(), "expected OpenAPI yaml/json artifact")

    def test_contract_uses_generic_booking_terms(self) -> None:
        files = self.openapi_files()
        self.assertTrue(files, "expected OpenAPI yaml/json artifact")
        contract = joined_file_text(files)

        for field in [
            "bookable_type",
            "bookable_id",
            "bookable_instance_id",
            "customer_id",
            "guest_reference",
            "organisation_id",
            "payment_id",
        ]:
            self.assertIn(field, contract)

    def test_mutation_endpoints_require_idempotency(self) -> None:
        files = self.openapi_files()
        self.assertTrue(files, "expected OpenAPI yaml/json artifact")
        contract = joined_file_text(files).lower()

        for method in ["post:", "patch:", "put:", "delete:"]:
            if method in contract:
                self.assertIn("idempotency", contract)
                self.assertIn("idempotency-key", contract)
                return

        self.fail("expected at least one mutation endpoint in OpenAPI contract")

    def test_contract_declares_required_error_codes(self) -> None:
        files = self.openapi_files()
        self.assertTrue(files, "expected OpenAPI yaml/json artifact")
        contract = joined_file_text(files).lower()

        required_errors = [
            "duplicate",
            "invalid_status",
            "invalid_payment",
            "unauthorized",
            "unavailable",
        ]

        for error_code_fragment in required_errors:
            self.assertIn(error_code_fragment, contract)

    def test_contract_excludes_external_domain_and_provider_objects(self) -> None:
        files = self.openapi_files()
        self.assertTrue(files, "expected OpenAPI yaml/json artifact")
        contract = joined_file_text(files).lower()

        forbidden_terms = [
            "stripe_payment_intent",
            "paypal_order",
            "user_profile",
            "course_detail",
            "academy_profile",
            "card_number",
        ]

        for forbidden in forbidden_terms:
            self.assertNotIn(forbidden, contract)


class BookingMigrationContractTests(unittest.TestCase):
    def migration_root(self) -> Path:
        return BOOKING_ROOT / "migrations"

    def migration_files(self) -> list[Path]:
        return sql_files(self.migration_root())

    def test_migration_directory_structure_exists(self) -> None:
        expected_dirs = ["schema", "tables", "types", "functions", "procedures"]
        missing = [
            directory
            for directory in expected_dirs
            if not (self.migration_root() / directory).is_dir()
        ]

        self.assertEqual([], missing)

    def test_required_tables_are_defined_in_table_migrations(self) -> None:
        table_files = sql_files(self.migration_root() / "tables")
        self.assertTrue(table_files, "expected table migration files")

        required_tables = [
            "booking.bookings",
            "booking.booking_participants",
            "booking.booking_status_history",
            "booking.idempotency_keys",
            "booking.outbox_events",
        ]

        for table in required_tables:
            self.assertTrue(
                has_any_file(table_files, "create table", table),
                f"expected isolated table migration for {table}",
            )

    def test_required_index_or_constraint_coverage_exists(self) -> None:
        files = self.migration_files()
        self.assertTrue(files, "expected booking migration files")

        required_fragments = [
            "customer_id",
            "organisation_id",
            "bookable_instance_id",
            "payment_id",
            "status",
        ]

        for fragment in required_fragments:
            self.assertTrue(
                has_any_file(files, "create index", fragment)
                or has_any_file(files, "create unique index", fragment)
                or has_any_file(files, "constraint", fragment),
                f"expected index or constraint coverage for {fragment}",
            )

    def test_booking_ids_are_text_compatible(self) -> None:
        table_files = sql_files(self.migration_root() / "tables")
        self.assertTrue(table_files, "expected table migration files")
        table_sql = joined_file_text(table_files).lower()

        id_columns = [
            "id",
            "booking_id",
            "key",
            "aggregate_id",
        ]

        for column in id_columns:
            self.assertRegex(
                table_sql,
                rf"\b{column}\b\s+(text|varchar|character varying)\b",
                f"expected {column} to be text-compatible",
            )

        self.assertNotRegex(table_sql, r"\bbooking_id\b\s+uuid\b")

    def test_duplicate_active_registered_booking_is_protected(self) -> None:
        files = self.migration_files()
        self.assertTrue(files, "expected booking migration files")
        migration_sql = joined_file_text(files).lower()

        for fragment in [
            "customer_id",
            "bookable_type",
            "bookable_id",
            "bookable_instance_id",
        ]:
            self.assertIn(fragment, migration_sql)

        self.assertRegex(migration_sql, r"create\s+unique\s+index|unique\s*\(")
        self.assertRegex(migration_sql, r"where\s+.+status\s+.+(pending|confirmed)")

    def test_function_and_procedure_files_use_camel_case_names(self) -> None:
        routine_files = sql_files(self.migration_root() / "functions") + sql_files(
            self.migration_root() / "procedures"
        )
        self.assertTrue(routine_files, "expected function or procedure migration files")

        bad_files = []
        for path in routine_files:
            stem = re.sub(r"^\d+[_-]?", "", path.stem)
            if not is_camel_case(stem):
                bad_files.append(path.relative_to(BOOKING_ROOT).as_posix())

        self.assertEqual([], bad_files)

    def test_database_function_and_procedure_names_are_camel_case(self) -> None:
        routine_files = sql_files(self.migration_root() / "functions") + sql_files(
            self.migration_root() / "procedures"
        )
        self.assertTrue(routine_files, "expected function or procedure migration files")

        declarations: list[str] = []
        for path in routine_files:
            text = read_text(path)
            declarations.extend(
                match.group(2)
                for match in re.finditer(
                    r"create\s+(?:or\s+replace\s+)?(function|procedure)\s+(?:booking\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\(",
                    text,
                    re.IGNORECASE,
                )
            )

        self.assertTrue(declarations, "expected function or procedure declarations")

        bad_names = [name for name in declarations if not is_camel_case(name)]
        self.assertEqual([], bad_names)


if __name__ == "__main__":
    unittest.main()
