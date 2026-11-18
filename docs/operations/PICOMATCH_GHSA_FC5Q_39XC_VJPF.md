# picomatch ReDoS advisory: build and runtime exposure

As of 2026-11-17, the dependency audit reports
[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf),
a regular-expression denial of service in picomatch involving repeated extglob
patterns. The lockfile contains picomatch 4.0.5; the advisory covers versions
through 4.0.7 and did not list a fixed release at the time of this review.
The latest version observed on the npm registry at the review was 4.0.7.

Vite and its build plugins are development tools and are classified as
`devDependencies`. After that correction, `npm audit --omit=dev` reported no
vulnerabilities. A clean `npm ci --omit=dev --ignore-scripts` also completed
without installing Vite or picomatch. This limits the packages installed in the
production dependency layer; it does not fix the vulnerable library in the
development and build environment, and it does not prove that exploitation
there is impossible. The full `npm audit` continued to report findings through
picomatch and its dependents. Build only with trusted configuration and inputs,
and do not expose development servers or glob processing to untrusted users.

Re-run both `npm audit` and `npm audit --omit=dev` regularly. When a fixed
picomatch release becomes available, update the compatible dependency graph and
lockfile, review the advisory for version-specific guidance, and verify the
build and affected tests. Remove or revise this note when the issue is resolved.
