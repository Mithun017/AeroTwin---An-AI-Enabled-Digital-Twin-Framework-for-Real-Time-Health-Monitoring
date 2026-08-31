import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dax.engine import DAXEngine

e = DAXEngine()

queries = [
    "COUNTX(FILTER(LeakEvents,[zone] LIKE 'Zone 2%'),1)",
    "AVERAGEX(SensorReadings,[maf])",
    "MAXX(TwinResiduals,[ef_deviation])",
    "[Leak Rate]",
]

for expr in queries:
    print(f"\nInput: {expr}")
    try:
        expanded = e._expand_measures(expr)
        sql = e._dax_to_sql(expanded)
        print(f"SQL: {sql}")
        result = e.query(expr)
        print(f"Result: success={result['success']}, scalar={result.get('scalar_value')}, err={result.get('error')}")
    except Exception as ex:
        print(f"ERROR: {ex}")
