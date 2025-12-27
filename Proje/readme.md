**kullanılacak diller**
html ,css,js
**backend bilgileri**
backend kısmını akadaşım yapacak ve supabase kullanacak kednsisi dosya larda düzenlemeleri o halde yap. .env supabase bilgileri orda olacak kütüphaneyide güncel kullan .
** konu**
senden istediğim bir eğitim sitesinin giriş yap ve kayıt ol kısmını yapman . renk seçimlerini psikolojiden yararlanarak seç.lütfen yaparken buglardan kaçın.ekrana google ile giriş yap kısmda olsun.bana tüm yaptıgın olayları bir sayfada türkçe birşekilde anlat. 

**kod yapısı**
import 'package:supabase_flutter/supabase_flutter.dart';

class EmailAuthService {
  final _supabase = Supabase.instance.client;

  Future<User?> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _supabase.auth.signInWithPassword(email: email, password: password);
      return credential.user;
    } on AuthException {
      rethrow;
    } catch(e) {
      rethrow;
    }
  }

  Future<User?> signUp({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      final credential = await _supabase.auth.signUp(
        email: email,
        password: password, data: {'display_name': displayName}
      );
      return credential.user;
    } on AuthException {
      rethrow;
    } catch (e) {
      rethrow;
    }
  }

} kod yapısı bu şekilde olsun 
