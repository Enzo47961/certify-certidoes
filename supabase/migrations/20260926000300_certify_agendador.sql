-- Agendador de hora em hora: e-mail semanal, alertas de vencimento e demo às 3h.
-- O plano gratuito da Vercel só roda cron diário; o pg_cron chama a rota a cada hora.
-- Troque <APP_URL> e <CRON_SECRET> pelos valores reais antes de aplicar.
create extension if not exists pg_net;
select cron.schedule(
  'certify-agendador',
  '2 * * * *',
  $$ select net.http_get(
       url := '<APP_URL>/api/agendador',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
       timeout_milliseconds := 120000
     ) $$
);
