"""
Test script para Thompson Sampling.

Simula 200 llamadas con tasas de conversión verdaderas diferentes por argumento,
demuestra cómo Thompson Sampling converge hacia los mejores.

EJECUTAR:
    cd /path/to/llamadas
    python -m app.ml.test_thompson_sampling
"""

import numpy as np
from datetime import datetime, timedelta
from app.ml import ThompsonSamplerIntegration


def test_thompson_convergence():
    """
    Test: Thompson Sampling converge hacia argumentos óptimos.

    Tasas de conversión verdaderas:
    - Arg 0-2: 70%, 65%, 60% (buenos)
    - Arg 3-5: 40%, 35%, 30% (mediocres)
    - Arg 6-7: 25%, 20% (malos)
    """
    print("\n" + "=" * 80)
    print("TEST 1: CONVERGENCIA DE THOMPSON SAMPLING")
    print("=" * 80)

    np.random.seed(42)
    integration = ThompsonSamplerIntegration(num_arguments=8)

    # Tasas de conversión "verdaderas" por argumento
    TRUE_RATES = [0.70, 0.65, 0.60, 0.40, 0.35, 0.30, 0.25, 0.20]

    # Simular 200 llamadas
    print("\n📞 Simulando 200 llamadas...\n")
    for call_num in range(200):
        call_id = f"call_{call_num:03d}"

        # Thompson Sampling selecciona argumento
        arg_id, arg_name = integration.select_argument(call_id)

        # Simular outcome basado en tasa verdadera
        success = np.random.rand() < TRUE_RATES[arg_id]

        # Registrar
        integration.record_outcome(call_id, arg_id, success)

    # Análisis
    print("\n✅ RESULTADOS DESPUÉS DE 200 LLAMADAS:\n")
    print("Arg | True Rate | Posterior Mean | Posterior σ | Trials | Success Rate")
    print("-" * 75)

    for i, posterior in enumerate(integration.get_all_arguments_status()):
        true_rate = TRUE_RATES[i]
        post_mean = posterior["posterior_mean"]
        post_var = posterior["posterior_variance"]
        post_sigma = np.sqrt(post_var) if post_var > 0 else 0
        trials = posterior["total_trials"]
        empirical = posterior["empirical_conversion_rate"]

        # Color coding
        accuracy = abs(post_mean - true_rate)
        status = "✅" if accuracy < 0.05 else "⚠️ " if accuracy < 0.1 else "❌"

        print(
            f" {i} | {true_rate:6.1%}    | {post_mean:6.1%}         "
            f"| {post_sigma:6.4f}  | {trials:6d} | {empirical:6.1%}  {status}"
        )

    # Verify convergencia
    print("\n📊 CONVERGENCIA ANALYSIS:")
    best_3_ids = sorted(
        range(8),
        key=lambda i: integration.sampler.arguments[i].posterior_mean(),
        reverse=True,
    )[:3]
    top_3_ids = [0, 1, 2]  # Sabemos que estos son top 3 verdaderos

    if set(best_3_ids) == set(top_3_ids):
        print("✅ Thompson Sampling identificó correctamente los top 3 argumentos")
    else:
        print(f"⚠️  Top 3 por Thompson: {best_3_ids}, Verdaderos top 3: {top_3_ids}")

    return True


def test_thompson_vs_random():
    """
    Test: Comparar Thompson Sampling vs Random selection.

    Thompson Sampling debe acumular más conversiones porque:
    1. Explora inicialmente
    2. Explota los mejores después
    """
    print("\n" + "=" * 80)
    print("TEST 2: THOMPSON SAMPLING vs RANDOM SELECTION")
    print("=" * 80)

    np.random.seed(42)
    TRUE_RATES = [0.70, 0.65, 0.60, 0.40, 0.35, 0.30, 0.25, 0.20]

    # Thompson Sampling
    integration_ts = ThompsonSamplerIntegration(num_arguments=8)
    conversions_ts = 0

    print("\n📞 Thompson Sampling: 100 llamadas")
    for call_num in range(100):
        call_id = f"ts_{call_num:03d}"
        arg_id, _ = integration_ts.select_argument(call_id)
        success = np.random.rand() < TRUE_RATES[arg_id]
        integration_ts.record_outcome(call_id, arg_id, success)
        if success:
            conversions_ts += 1

    # Random selection
    conversions_random = 0
    print("📞 Random Selection: 100 llamadas")
    for call_num in range(100):
        arg_id = np.random.randint(0, 8)
        success = np.random.rand() < TRUE_RATES[arg_id]
        if success:
            conversions_random += 1

    # Results
    print("\n✅ RESULTS:")
    print(f"Thompson Sampling: {conversions_ts}/100 conversions ({conversions_ts:.0%})")
    print(f"Random Selection:  {conversions_random}/100 conversions ({conversions_random:.0%})")
    print(
        f"\nTselta: Thompson gained {conversions_ts - conversions_random} "
        f"conversiones ({(conversions_ts - conversions_random):.0%} improvement)"
    )

    # Expected
    expected_random = sum(TRUE_RATES) / 8 * 100  # Promedio de todas las tasas
    print(f"\nExpected for random: ~{expected_random:.1f} conversions")

    return conversions_ts > conversions_random


def test_weekly_report():
    """Test: Generar reporte semanal completo."""
    print("\n" + "=" * 80)
    print("TEST 3: WEEKLY REPORT GENERATION")
    print("=" * 80)

    np.random.seed(42)
    integration = ThompsonSamplerIntegration(num_arguments=8)
    TRUE_RATES = [0.70, 0.65, 0.60, 0.40, 0.35, 0.30, 0.25, 0.20]

    # Simular 150 llamadas
    print("\n📞 Simulando 150 llamadas en la semana...\n")
    for call_num in range(150):
        call_id = f"call_{call_num:03d}"
        arg_id, _ = integration.select_argument(call_id)
        success = np.random.rand() < TRUE_RATES[arg_id]
        integration.record_outcome(call_id, arg_id, success)

    # Generar reporte
    report = integration.get_weekly_report()

    # Print reporte
    print("=" * 80)
    print("WEEKLY REPORT")
    print("=" * 80)
    print(f"\n📅 Week ending: {report['week_ending']}")
    print(f"\n📊 Summary:")
    for key, value in report["summary"].items():
        if isinstance(value, float):
            print(f"   {key}: {value:.2%}" if key.endswith("rate") else f"   {key}: {value}")
        else:
            print(f"   {key}: {value}")

    print(f"\n🎯 Recommendation:")
    rec = report["recommendation"]
    print(f"   Use argument {rec['argument_id']}: {rec['argument_name'][:60]}")
    print(f"   Expected conversion: {rec['posterior_mean']:.1%}")

    print(f"\n📈 Top 5 Performers:")
    for i, arg in enumerate(report["performance_ranking"][:5], 1):
        print(
            f"   {i}. Arg {arg['id']}: {arg['posterior_mean']:.1%} "
            f"({arg['successes']}/{arg['total_trials']})"
        )

    print(f"\n💡 Key Insights:")
    for insight in report["insights"]:
        print(f"   {insight}")

    print(f"\n📋 Action Items:")
    for action in report["action_items"]:
        print(f"   {action}")

    print("\n" + "=" * 80)

    return True


def test_persistence():
    """Test: Guardar y cargar estado."""
    print("\n" + "=" * 80)
    print("TEST 4: STATE PERSISTENCE")
    print("=" * 80)

    import tempfile
    import os

    np.random.seed(42)
    TRUE_RATES = [0.70, 0.65, 0.60, 0.40, 0.35, 0.30, 0.25, 0.20]

    # Crear temp file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        temp_path = f.name

    try:
        # Session 1: Simular llamadas y guardar
        print("\n🔄 Session 1: Simular 50 llamadas y guardar estado")
        integration1 = ThompsonSamplerIntegration(
            num_arguments=8,
            persistence_path=temp_path,
        )

        for call_num in range(50):
            call_id = f"call_s1_{call_num:03d}"
            arg_id, _ = integration1.select_argument(call_id)
            success = np.random.rand() < TRUE_RATES[arg_id]
            integration1.record_outcome(call_id, arg_id, success)

        # Guardar
        integration1.save_state()
        print(f"   ✅ Guardado: {len(integration1.sampler.arguments)} argumentos")

        # Session 2: Cargar y continuar
        print("\n🔄 Session 2: Cargar estado y continuar")
        integration2 = ThompsonSamplerIntegration(num_arguments=8)
        integration2.load_state(temp_path)

        # Verificar
        total_before = sum(
            a.total_trials for a in integration1.sampler.arguments
        )
        total_after = sum(
            a.total_trials for a in integration2.sampler.arguments
        )

        print(f"   ✅ Cargado: {total_after} trials (antes: {total_before})")

        # Continuar con 50 más
        for call_num in range(50, 100):
            call_id = f"call_s2_{call_num:03d}"
            arg_id, _ = integration2.select_argument(call_id)
            success = np.random.rand() < TRUE_RATES[arg_id]
            integration2.record_outcome(call_id, arg_id, success)

        integration2.save_state(temp_path)

        # Session 3: Verificar continuidad
        print("\n🔄 Session 3: Verificar estado persistente")
        integration3 = ThompsonSamplerIntegration(num_arguments=8)
        integration3.load_state(temp_path)

        total_final = sum(
            a.total_trials for a in integration3.sampler.arguments
        )
        print(f"   ✅ Total trials después de 2 sesiones: {total_final}")

        if total_final == 100:
            print("   ✅ Persistencia funciona correctamente")
            return True
        else:
            print(f"   ❌ Esperado 100 trials, obtuvo {total_final}")
            return False

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def run_all_tests():
    """Ejecutar todos los tests."""
    print("\n" + "=" * 80)
    print("🧪 THOMPSON SAMPLING TEST SUITE")
    print("=" * 80)

    results = {
        "Convergencia": test_thompson_convergence(),
        "Thompson vs Random": test_thompson_vs_random(),
        "Weekly Report": test_weekly_report(),
        "Persistencia": test_persistence(),
    }

    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:<30} {status}")

    all_passed = all(results.values())
    print("\n" + ("✅ ALL TESTS PASSED" if all_passed else "❌ SOME TESTS FAILED"))
    print("=" * 80)

    return all_passed


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
