/** The whole assertion library: name it, compare it, count it. */
export function harness(title) {
  let pass = 0;
  const failures = [];

  const check = (name, got, want = true) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (ok) pass += 1;
    else failures.push({ name, got, want });
    console.log(`  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}`);
    if (!ok) {
      console.log(`      got:  ${JSON.stringify(got)}`);
      console.log(`      want: ${JSON.stringify(want)}`);
    }
  };

  const done = () => {
    console.log(`  ${pass} passed, ${failures.length} failed`);
    process.exit(failures.length === 0 ? 0 : 1);
  };

  return { check, done, title };
}
