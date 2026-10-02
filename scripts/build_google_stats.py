"""Build the Google Sheets version of the response statistics workbook.

Usage: python3 scripts/build_google_stats.py [--test-data]
Writes docs/google-forms/Global_AR_回收統計_Google試算表版.xlsx (upload it to Google Drive; it converts
to a Google Sheet). With --test-data, writes docs/m365/_test_gstats.xlsx filled with fake data for checks.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_m365_files as b  # noqa: E402

print(b.build_stats(test_data="--test-data" in sys.argv, google=True))
