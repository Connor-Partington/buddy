-- Read-only public rankings. No identity, registration, or score submission required.
-- Uses the SAME monthly admission budget as member requests. Client caches for six hours.
create or replace function public.buddy_leaderboard_public()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare quota buddy_private.budget%rowtype; result jsonb; retry integer;
begin
 select * into quota from buddy_private.budget where id = true for update;
 if not found then return jsonb_build_object('status','budget','retry_after',86400); end if;
 if quota.month <> date_trunc('month',now())::date then
  update buddy_private.budget set month=date_trunc('month',now())::date,requests=0 where id=true;
  quota.requests:=0;
 end if;
 retry:=greatest(60,ceil(extract(epoch from (date_trunc('month',now())+interval '1 month'-now())))::integer);
 if not quota.enabled or quota.requests >= quota.request_limit then
  return jsonb_build_object('status','budget','retry_after',case when quota.enabled then retry else 86400 end);
 end if;
 update buddy_private.budget set requests=requests+1 where id=true;
 with ranked as (
  select nickname, days, level, updated, token_hash, rank() over(order by days desc) as rank
  from buddy_private.entries where updated > now()-interval '30 days'
 ), top_rows as (
  select nickname, days, level, updated, rank from ranked order by days desc,nickname,token_hash limit 50
 ) select jsonb_build_object('status','ok','me',null,
  'rows',coalesce((select jsonb_agg(to_jsonb(t)) from top_rows t),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.buddy_leaderboard_public() from public, authenticated;
grant execute on function public.buddy_leaderboard_public() to anon;
