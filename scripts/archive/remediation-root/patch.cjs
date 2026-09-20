const fs = require('fs');
const code = fs.readFileSync('apps/web/src/features/auth/LoginPage.tsx', 'utf8');
const beforeSubmit = code.substring(0, code.indexOf('const submit = (event: FormEvent) => {'));
const submitCode = `const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage(isRtl ? 'الرجاء إدخال البريد الإلكتروني.' : 'Email is required.');
      return;
    }
    if (!password) {
      setMessage(isRtl ? 'الرجاء إدخال كلمة المرور.' : 'Password is required.');
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error?.message || (isRtl ? 'بيانات الاعتماد غير صالحة' : 'Invalid credentials'));
        return;
      }
      
      const { accessToken, refreshToken } = result.data;
      localStorage.setItem('manaratak_access_token', accessToken);
      localStorage.setItem('manaratak_refresh_token', refreshToken);
      localStorage.removeItem('manaratak_demo_role');
      localStorage.removeItem('manaratak_demo_email');

      // Check where to route
      if (role === 'admin' || normalizedEmail === 'wegdangamil2022@gmail.com') {
          let adminUrl = import.meta.env.VITE_ADMIN_URL;
          if (!adminUrl || adminUrl === '/admin') {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
              adminUrl = 'http://localhost:3001';
            } else {
              navigate('/admin');
              return;
            }
          }
          window.location.href = adminUrl;
      } else {
          const studentRef = normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : 'student';
          navigate(\`/student/\${encodeURIComponent(studentRef)}\`);
      }
    } catch (error) {
      setMessage(isRtl ? 'حدث خطأ في النظام.' : 'System error occurred.');
    }
  };`;
const afterSubmit = code.substring(code.indexOf('return ('));
fs.writeFileSync('apps/web/src/features/auth/LoginPage.tsx', beforeSubmit + submitCode + '\n\n  ' + afterSubmit);
