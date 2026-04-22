#!/bin/bash
#
# Run all k6 performance test scenarios sequentially.
# Outputs results to test/performance/results/
#
# Usage:
#   bash apps/api/test/performance/run-all.sh
#   API_URL=http://staging:4000/api/v1 bash apps/api/test/performance/run-all.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Check k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "Error: k6 is not installed. Install with: brew install k6"
  exit 1
fi

# Create results directory
mkdir -p "${RESULTS_DIR}"

echo "=========================================="
echo " MoviePlatform Performance Tests"
echo " Timestamp: ${TIMESTAMP}"
echo " API URL: ${API_URL:-http://localhost:4000/api/v1}"
echo "=========================================="
echo ""

SCENARIOS=(
  "content-listing"
  "search"
  "auth-flow"
  "streaming-urls"
  "mixed-load"
)

FAILED=0
PASSED=0

for scenario in "${SCENARIOS[@]}"; do
  SCENARIO_FILE="${SCENARIOS_DIR}/${scenario}.js"
  RESULT_FILE="${RESULTS_DIR}/${scenario}_${TIMESTAMP}.json"

  if [ ! -f "${SCENARIO_FILE}" ]; then
    echo "[SKIP] ${scenario} — file not found"
    continue
  fi

  echo "[RUN] ${scenario}..."
  echo "  File: ${SCENARIO_FILE}"
  echo "  Output: ${RESULT_FILE}"

  if k6 run \
    --out json="${RESULT_FILE}" \
    --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
    "${SCENARIO_FILE}" 2>&1; then
    echo "[PASS] ${scenario}"
    PASSED=$((PASSED + 1))
  else
    echo "[FAIL] ${scenario}"
    FAILED=$((FAILED + 1))
  fi

  echo ""
  echo "------------------------------------------"
  echo ""

  # Brief pause between scenarios
  sleep 5
done

echo "=========================================="
echo " Results: ${PASSED} passed, ${FAILED} failed"
echo " Results saved to: ${RESULTS_DIR}/"
echo "=========================================="

exit ${FAILED}
