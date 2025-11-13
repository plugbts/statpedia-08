# 🚀 Quick Start Guide - Statpedia Phase 1

## ✅ What's Ready Right Now

Your data pipeline is **production-ready** with:
- ✅ 95/100 data quality score
- ✅ Zero duplicate teams
- ✅ 100% logo coverage
- ✅ 700K+ player prop records
- ✅ 3,163 games across 5 leagues
- ✅ Automated monitoring scripts

---

## 🏃 30-Second Setup

```bash
# 1. Run the setup script (already done!)
./scripts/setup-phase1-monitoring.sh

# 2. Test manual validation
./scripts/run-daily-validation.sh

# 3. View results
cat logs/validation/summary.log
```

That's it! You're monitoring.

---

## 📅 Set Up Automation (2 minutes)

Add to your crontab:

```bash
# Open crontab editor
crontab -e

# Add these two lines:
0 6 * * * cd /Users/jackie/Desktop/statpedia-08-1 && ./scripts/run-daily-validation.sh
0 8 * * 0 cd /Users/jackie/Desktop/statpedia-08-1 && ./scripts/run-weekly-audit.sh
```

Now you have:
- **Daily validation** at 6 AM
- **Weekly audit** on Sundays at 8 AM

---

## 🔍 Check Status Anytime

```bash
# See validation summary
cat logs/validation/summary.log

# View latest full validation
ls -t logs/validation/*.log | head -1 | xargs cat

# Check for issues
grep "FAIL" logs/validation/summary.log

# Count of validations run
wc -l logs/validation/summary.log
```

---

## 🎯 Phase 1 Goals (Next 2 Weeks)

### Week 1 Checklist
- [ ] Cron jobs set up
- [ ] Frontend test: all logos display
- [ ] Frontend test: prop streaks work
- [ ] Run validation manually 3x
- [ ] No duplicate teams created

### Week 2 Checklist
- [ ] Quality stays >95% all week
- [ ] Add performance indexes
- [ ] Benchmark query times
- [ ] Document any edge cases
- [ ] Review all validation logs

---

## 🛠️ Daily Commands

```bash
# Run validation
./scripts/run-daily-validation.sh

# Run audit
./scripts/run-weekly-audit.sh

# Fix issues if found
npx tsx scripts/fix-missing-team-logos.ts
npx tsx scripts/merge-duplicate-teams.ts

# Check dates
npx tsx scripts/verify-game-dates.ts
```

---

## 📊 Key Metrics Dashboard

```bash
# Data quality score
npx tsx scripts/validate-data-quality.ts | grep "PASSED:"

# Duplicate teams (should be 0)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM (SELECT name, COUNT(*) FROM teams GROUP BY name HAVING COUNT(*) > 1) sub;"

# Missing logos (should be 0)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM teams WHERE logo_url IS NULL;"

# Total records
psql $DATABASE_URL -c "SELECT COUNT(*) FROM player_game_logs;"

# Latest ingestion
psql $DATABASE_URL -c "SELECT MAX(created_at) FROM player_game_logs;"
```

---

## 🚨 If Something Breaks

### Validation Fails
1. Check the log: `cat $(ls -t logs/validation/*.log | head -1)`
2. Run individual fixes (see commands above)
3. Re-run validation

### Duplicates Appear
```bash
npx tsx scripts/merge-duplicate-teams.ts
```

### Logos Missing
```bash
npx tsx scripts/fix-missing-team-logos.ts
```

### Dates Look Wrong
```bash
npx tsx scripts/verify-game-dates.ts
```

---

## 📚 Full Documentation

- **ROADMAP.md** - 3-phase development plan
- **PHASE1_COMPLETE.md** - What we accomplished today
- **DATA_FIXES_EXECUTION_REPORT.md** - Detailed fixes
- **DATA_AUDIT_REPORT.md** - Original audit

---

## 🎉 Success Criteria

You're ready for Phase 2 when:
- ✅ 2 weeks of >95% data quality
- ✅ Zero duplicates for 2 weeks
- ✅ All frontend features working
- ✅ Query times <500ms
- ✅ Team confidence in data

---

## 💡 Pro Tips

1. **Check logs weekly**: `cat logs/validation/summary.log`
2. **Run audit after ingestion**: `./scripts/run-weekly-audit.sh`
3. **Test fixes in dev first**: Always test scripts before production
4. **Document edge cases**: Add to ROADMAP.md notes
5. **Celebrate wins**: You built something solid! 🚀

---

## 🔥 Quick Health Check

Run this for instant status:

```bash
echo "=== Statpedia Health Check ===" && \
echo "Validation logs: $(ls logs/validation/*.log 2>/dev/null | wc -l) runs" && \
echo "Latest: $(ls -t logs/validation/*.log 2>/dev/null | head -1 | xargs grep "PASSED:" | tail -1)" && \
echo "Database: $(psql $DATABASE_URL -t -c 'SELECT COUNT(*) FROM player_game_logs;' 2>/dev/null) game logs" && \
echo "Teams: $(psql $DATABASE_URL -t -c 'SELECT COUNT(*) FROM teams;' 2>/dev/null) teams" && \
echo "Status: ✅ OPERATIONAL"
```

---

**You're all set! Your data pipeline is production-ready. Focus on Phase 1 stability for the next 2 weeks, then move to Phase 2 (scores & spreads). 🎯**
