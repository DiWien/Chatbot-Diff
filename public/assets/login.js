const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');
const params = new URLSearchParams(location.search);
const nextUrl = params.get('next') || '/admin';

fetch('/api/auth/me').then((res) => { if (res.ok) location.href = nextUrl; });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  btn.textContent = 'Đang đăng nhập...';
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');
    location.href = nextUrl;
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    btn.textContent = 'Đăng nhập';
    btn.disabled = false;
  }
});
