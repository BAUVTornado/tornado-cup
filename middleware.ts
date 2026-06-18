import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Eğer kullanıcı /admin ile başlayan bir sayfaya gitmeye çalışıyorsa korumayı devreye sok
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // Tarayıcı çerezlerinden (cookies) "admin_token" adındaki giriş anahtarını kontrol et
    const token = request.cookies.get('admin_token')?.value;

    // Belirlediğin gizli giriş anahtarı (Bunu istediğin bir şey yapabilirsin)
    const GIZLI_ANAHTAR = "R27r042018"; 

    // Eğer anahtar yoksa veya yanlışsa, admin paneline girmesine izin verme!
    if (!token || token !== GIZLI_ANAHTAR) {
      // Kullanıcıyı direkt sitenin ana sayfasına (giriş yapamadığı için) geri postala
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Bu middleware sadece /admin altındaki sayfalarda çalışsın diyoruz
export const config = {
  matcher: '/admin/:path*',
};