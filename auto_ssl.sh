sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d zhaozhan.site -m zhaozhan.site@gmail.com -n --agree-tos --redirect
sudo systemctl status certbot.timer | cat
sudo certbot renew --dry-run | cat