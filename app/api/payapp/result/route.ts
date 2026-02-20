import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// payapp이 결제 후 사용자를 리다이렉트하는 returnurl
// GET 또는 POST로 호출됨
async function handleResult(
  state: string | null,
  mul_no: string | null,
  var1: string | null,
  tradeid: string | null,
  price: string | null,
  message: string | null,
) {
  if (state === '1') {
    // 결제 성공 → DB 업데이트
    if (var1) {
      await supabaseAdmin
        .from('employment_applications')
        .update({
          payment_status: 'paid',
          payment_id: mul_no || undefined,
          status: 'confirmed',
        })
        .eq('id', var1);

      console.log(`[PAYAPP RESULT] 결제 완료 - 신청 ID: ${var1}, mul_no: ${mul_no}, 금액: ${price}원`);
      // Slack 알림은 feedback(서버-서버)에서만 전송
    }

    // 성공 HTML: 팝업이면 부모 창을 step=3으로 이동 후 닫기, 모바일이면 직접 이동
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제 완료</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
      }
      .container {
        text-align: center;
        background: white;
        padding: 60px 40px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 100%;
        animation: slideUp 0.5s ease-out;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .checkmark {
        width: 100px;
        height: 100px;
        margin: 0 auto 30px;
        animation: scaleIn 0.6s ease-out 0.2s both;
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }
      h1 { color: #191f28; margin: 0 0 15px 0; font-size: 28px; font-weight: 700; line-height: 1.3; }
      p { color: #888; margin: 0; font-size: 15px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <svg class="checkmark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#667eea" stroke-width="2"/>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#667eea" stroke-width="8"
          stroke-dasharray="283" stroke-dashoffset="283"
          style="animation: dash 0.6s ease-in-out 0.3s forwards;"/>
        <path d="M 35 50 L 47 62 L 70 38" stroke="#667eea" stroke-width="6" fill="none"
          stroke-linecap="round" stroke-linejoin="round"
          style="animation: checkmark 0.6s ease-out 0.5s both;"/>
      </svg>
      <h1>결제가 완료되었습니다!</h1>
      <p>잠시 후 페이지가 이동됩니다...</p>
    </div>
    <script>
      var style = document.createElement('style');
      style.innerHTML = \`
        @keyframes dash { to { stroke-dashoffset: 0; } }
        @keyframes checkmark {
          from { stroke-dasharray: 100; stroke-dashoffset: 100; }
          to { stroke-dasharray: 100; stroke-dashoffset: 0; }
        }
      \`;
      document.head.appendChild(style);

      setTimeout(function() {
        if (window.opener) {
          window.opener.location.href = '/?payment=success&step=3';
          window.close();
        } else {
          window.location.href = '/?payment=success&step=3';
        }
      }, 500);
    </script>
  </body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } else if (state === '0') {
    // 결제 실패
    if (var1) {
      await supabaseAdmin
        .from('employment_applications')
        .update({ payment_status: 'failed' })
        .eq('id', var1);
    }

    const failHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제 실패</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex; align-items: center; justify-content: center;
        min-height: 100vh; background: #f5f5f5; padding: 20px;
      }
      .container {
        text-align: center; background: white; padding: 40px;
        border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 400px; width: 100%;
      }
      h1 { color: #d32f2f; margin: 0 0 10px 0; font-size: 22px; }
      p { color: #666; margin: 0; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>✗ 결제가 실패했습니다</h1>
      <p>${message || '결제가 취소되었습니다.'}<br>잠시 후 창이 자동으로 닫힙니다...</p>
    </div>
    <script>
      setTimeout(function() {
        if (window.opener) { window.close(); }
        else { window.location.href = '/'; }
      }, 3000);
    </script>
  </body>
</html>`;
    return new NextResponse(failHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } else {
    // state 없음 (결제창 닫기 등) → 일단 step=3으로 이동
    const unknownHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제 확인 중</title>
  </head>
  <body>
    <div style="padding: 40px; text-align: center;">
      <h1>결제 상태를 확인하고 있습니다</h1>
      <p>잠시만 기다려주세요...</p>
    </div>
    <script>
      setTimeout(function() {
        if (window.opener) {
          window.opener.location.href = '/?payment=success&step=3';
          window.close();
        } else {
          window.location.href = '/?payment=success&step=3';
        }
      }, 500);
    </script>
  </body>
</html>`;
    return new NextResponse(unknownHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  return handleResult(
    sp.get('state'),
    sp.get('mul_no'),
    sp.get('var1'),
    sp.get('tradeid'),
    sp.get('price'),
    sp.get('message'),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    return handleResult(
      params.get('state'),
      params.get('mul_no'),
      params.get('var1'),
      params.get('tradeid'),
      params.get('price'),
      params.get('message'),
    );
  } catch {
    return new NextResponse('error', { status: 500 });
  }
}
