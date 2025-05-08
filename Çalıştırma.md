# ─── Geliştirme (hot-reload) ─────────────────────────────────────
cd C:\FocalBoard\docker
docker-compose \
  -f docker-compose-db-nginx.yml \
  -f docker-compose.dev.yml \
  up

# ─── Üretim (optimize edilmiş build) ─────────────────────────────
cd C:\FocalBoard\docker
docker-compose -f docker-compose-db-nginx.yml down -v
docker-compose -f docker-compose-db-nginx.yml up -d --build

# ─── Faydalı Diğer Komutlar ───────────────────────────────────────
docker-compose -f docker-compose-db-nginx.yml ps          # Container durumunu gösterir  
docker-compose -f docker-compose-db-nginx.yml logs -f     # Logları takip eder  
docker-compose -f docker-compose-db-nginx.yml restart focalboard  # Tek servisi yeniden başlatır  
docker-compose -f docker-compose-db-nginx.yml exec focalboard sh # Servis içinde kabuğa girer  
docker system prune -af                                   # Kullanılmayan her şeyi temizler  
