╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cert-session  |  DEPRECATED since v11.2                  ║
╚══════════════════════════════════════════════════════════════════════╝

**This skill is deprecated. Use `/start` instead.**

`/start` replaces `/cert-session` with a faster, more accurate session orientation.
It reads project context, loads active instincts, surfaces the health score,
and injects session constraints — everything cert-session did, better.

```
Old: /cert-session
New: /start
```

If you're seeing this, your project still has the old cert-session installed.
Update it:
```bash
cp C:\luv\Cortex\skills\cert-session.md [project]\.claude\commands\cert-session.md
```

Or re-run Cortex setup to sync all skills:
```bash
node C:\luv\Cortex\setup.js --sync [project-path]
```
