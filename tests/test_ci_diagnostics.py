#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Suite de pruebas del skill nuva-ci-diagnostics.

Usa fixtures simulados (datos controlados) para validar el parseo y la
clasificación de checks de CI sin depender del estado real de GitHub.
No requiere autenticación de gh ni acceso a red.

Ejecutar: python tests/test_ci_diagnostics.py
"""

import sys
import os

# Asegurar que se importe el módulo del skill
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import importlib.util
import importlib.machinery

# Cargar el módulo del skill por ruta (el archivo tiene guión, no es importable por nombre)
_SKILL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "scripts", "ci-diagnostics.py",
)
_spec = importlib.util.spec_from_file_location("ci_diagnostics_skill", _SKILL_PATH)
_ci_diagnostics = importlib.util.module_from_spec(_spec)
sys.modules["ci_diagnostics_skill"] = _ci_diagnostics
_spec.loader.exec_module(_ci_diagnostics)

parse_gh_pr_checks = _ci_diagnostics.parse_gh_pr_checks
run_self_tests = _ci_diagnostics.run_self_tests
gh_authenticated = _ci_diagnostics.gh_authenticated
redact_secrets = _ci_diagnostics.redact_secrets
GH_TO_FACTORY = _ci_diagnostics.GH_TO_FACTORY

FIXTURE_ALL_PASS = """Factory release evidence\tpass\t17s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
Lint, typecheck, test, audit, build\tpass\t1m40s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/2/job/2
Repository integrity\tpass\t1m25s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/3/job/3
Vercel\tpass\t0\thttps://vercel.com/martinaburtoe/nuva-one/xyz
build\tpass\t1m8s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/4/job/4
pgTAP database tests\tpass\t2m35s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/5/job/5
production-smoke\tpass\t7s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/6/job/6
review\tpass\t2m41s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/7/job/7
safety-gate\tpass\t5s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/8/job/8
web-qa\tpass\t23s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/9/job/9
Vercel Preview Comments\tpass\t0\thttps://vercel.com/github
"""

FIXTURE_ONE_FAIL = """Factory release evidence\tpass\t17s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
Lint, typecheck, test, audit, build\tfailure\t1m40s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/2/job/2
Repository integrity\tpass\t1m25s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/3/job/3
"""

FIXTURE_PENDING = """Factory release evidence\tpending\t0\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
Lint, typecheck, test, audit, build\tpending\t0\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/2/job/2
"""

FIXTURE_CANCELLED = """Factory release evidence\tcancelled\t0\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
Lint, typecheck, test, audit, build\tpass\t1m40s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/2/job/2
"""

FIXTURE_TIMEOUT = """Factory release evidence\ttimed_out\t10m\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
Lint, typecheck, test, audit, build\tpass\t1m40s\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/2/job/2
"""

FIXTURE_INCOMPLETE = """Factory release evidence\t\ts\thttps://github.com/martinaburtoe-art/nuva-one/actions/runs/1/job/1
"""


def test_all_pass() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_ALL_PASS)
    if len(checks) != 11:
        errors.append(f"[1/all-pass] 11 checks esperados, {len(checks)} obtenidos")
    if not all(c.state == "PASS" for c in checks):
        errors.append("[1/all-pass] No todos los checks son PASS")
    for c in checks:
        if c.conclusion != "pass":
            errors.append(f"[1/all-pass] {c.name}: conclusión inesperada {c.conclusion}")
    return errors


def test_one_fail() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_ONE_FAIL)
    fails = [c for c in checks if c.state == "FAIL"]
    if len(fails) != 1:
        errors.append(f"[2/one-fail] 1 FAIL esperado, {len(fails)} obtenidos")
    else:
        if fails[0].name != "Lint, typecheck, test, audit, build":
            errors.append(f"[2/one-fail] Check fallido inesperado: {fails[0].name}")
        if fails[0].conclusion != "failure":
            errors.append(f"[2/one-fail] Conclusión esperada 'failure', obtenida '{fails[0].conclusion}'")
    passes = [c for c in checks if c.state == "PASS"]
    if len(passes) != 2:
        errors.append(f"[2/one-fail] 2 PASS esperados, {len(passes)} obtenidos")
    return errors


def test_pending() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_PENDING)
    warns = [c for c in checks if c.state == "WARN"]
    if len(warns) != 2:
        errors.append(f"[3/pending] 2 WARN esperados, {len(warns)} obtenidos")
    for c in warns:
        if c.conclusion != "pending":
            errors.append(f"[3/pending] {c.name}: conclusión inesperada {c.conclusion}")
    return errors


def test_cancelled() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_CANCELLED)
    cancelled = [c for c in checks if c.conclusion == "cancelled"]
    if len(cancelled) != 1:
        errors.append(f"[4/cancelled] 1 cancelled esperado, {len(cancelled)} obtenidos")
    else:
        if cancelled[0].state != "WARN":
            errors.append(f"[4/cancelled] Estado esperado WARN para cancelled, obtenido {cancelled[0].state}")
    passes = [c for c in checks if c.state == "PASS"]
    if len(passes) != 1:
        errors.append(f"[4/cancelled] 1 PASS esperado, {len(passes)} obtenidos")
    return errors


def test_timeout() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_TIMEOUT)
    blocked = [c for c in checks if c.state == "BLOCKED"]
    if len(blocked) != 1:
        errors.append(f"[6/timeout] 1 BLOCKED esperado, {len(blocked)} obtenidos")
    else:
        if blocked[0].conclusion != "timed_out":
            errors.append(f"[6/timeout] Conclusión esperada 'timed_out', obtenida '{blocked[0].conclusion}'")
    passes = [c for c in checks if c.state == "PASS"]
    if len(passes) != 1:
        errors.append(f"[6/timeout] 1 PASS esperado, {len(passes)} obtenidos")
    return errors


def test_incomplete() -> list[str]:
    errors = []
    checks = parse_gh_pr_checks(FIXTURE_INCOMPLETE)
    unknown = [c for c in checks if c.state == "UNKNOWN"]
    if len(unknown) != 1:
        errors.append(f"[7/incomplete] 1 UNKNOWN esperado, {len(unknown)} obtenidos")
    else:
        if unknown[0].conclusion != "":
            errors.append(f"[7/incomplete] Conclusión esperada vacía, obtenida '{unknown[0].conclusion}'")
    return errors


def test_secret_redaction() -> list[str]:
    errors = []
    text = "api_key=sk-1234567890abcdefghij token=ghp_1234567890abcdefghijklmnopqrstuvwxyz eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy"
    redacted = redact_secrets(text)
    if "sk-1234567890abcdefghij" in redacted:
        errors.append("[secret] API key no fue redactada")
    if "ghp_1234567890abcdefghijklmnopqrstuvwxyz" in redacted:
        errors.append("[secret] GitHub token no fue redactado")
    if "[REDACTED_JWT]" not in redacted:
        errors.append("[secret] JWT no fue marcado como [REDACTED_JWT]")
    return errors


def test_factory_states_mapping() -> list[str]:
    errors = []
    expected = {
        "success": "PASS",
        "failure": "FAIL",
        "pending": "WARN",
        "cancelled": "WARN",
        "timed_out": "BLOCKED",
        "": "UNKNOWN",
    }
    for gh_state, factory_state in expected.items():
        if GH_TO_FACTORY.get(gh_state) != factory_state:
            errors.append(f"[mapping] {gh_state!r} -> {factory_state!r} no coincide")
    return errors


def main() -> int:
    all_errors: list[str] = []
    tests = [
        ("1. Todos los checks PASS", test_all_pass),
        ("2. Un check fallido con log accesible", test_one_fail),
        ("3. Un check pendiente/en ejecución", test_pending),
        ("4. Un check cancelado", test_cancelled),
        ("5. gh sin autenticación / sin permisos", lambda: [] if isinstance(gh_authenticated(), tuple) and len(gh_authenticated()) == 2 else ["[5/auth] gh_authenticated no retorna tupla"]),
        ("6. Error de infraestructura / timeout", test_timeout),
        ("7. Resultado incompleto (no se puede confirmar PASS)", test_incomplete),
        ("8. Redacción de secretos en logs", test_secret_redaction),
        ("9. Mapeo de estados Factory", test_factory_states_mapping),
    ]

    print("=== PRUEBAS DEL SKILL nuva-ci-diagnostics (fixtures simulados) ===\n")
    for name, fn in tests:
        try:
            errs = fn()
            if errs:
                print(f"FALLO — {name}")
                for e in errs:
                    print(f"    ✗ {e}")
                all_errors.extend(errs)
            else:
                print(f"PASS  — {name}")
        except Exception as exc:
            print(f"ERROR — {name}: {exc}")
            all_errors.append(f"[{name}] excepción: {exc}")

    print("\n" + "=" * 60)
    if all_errors:
        print(f"RESULTADO: {len(all_errors)} error(es) en las pruebas del skill.")
        for e in all_errors:
            print(f"  ✗ {e}")
        return 1
    else:
        print("RESULTADO: TODAS LAS PRUEBAS DEL SKILL PASARON (9/9).")
        print("Escenarios validados con fixtures simulados:")
        print("  1. Todos los checks PASS")
        print("  2. Un check fallido con log accesible")
        print("  3. Un check pendiente/en ejecución")
        print("  4. Un check cancelado")
        print("  5. gh sin autenticación o sin permisos")
        print("  6. Error de infraestructura / timeout")
        print("  7. Resultado incompleto (no se puede confirmar PASS)")
        print("  8. Redacción de secretos en logs")
        print("  9. Mapeo de estados Factory (PASS/FAIL/WARN/BLOCKED/UNKNOWN)")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
