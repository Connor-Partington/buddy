-- Dedicated Buddy project only. Private tables are never exposed through the Data API.
create schema if not exists buddy_private;
revoke all on schema buddy_private from public, anon, authenticated;
create table if not exists buddy_private.entries (
  token_hash text primary key,
  nickname text not null check (nickname ~ '^[A-Za-z0-9 _-]{2,20}$'),
  days integer not null check (days between 0 and 36500),
  level integer not null check (level between 1 and 100),
  updated timestamptz not null default now(),
  last_read timestamptz
);
create index if not exists buddy_rank on buddy_private.entries (days desc);
alter table buddy_private.entries enable row level security;
create table if not exists buddy_private.budget (
  id boolean primary key default true check (id),
  month date not null default date_trunc('month', now())::date,
  requests integer not null default 0,
  registration_day date not null default current_date,
  registrations integer not null default 0,
  enabled boolean not null default true,
  request_limit integer not null default 100000 check (request_limit between 0 and 100000),
  member_limit integer not null default 5000 check (member_limit between 0 and 5000)
);
alter table buddy_private.budget enable row level security;
insert into buddy_private.budget(id) values(true) on conflict do nothing;
revoke all on all tables in schema buddy_private from public, anon, authenticated;

create or replace function public.buddy_leaderboard(
  p_token text, p_action text, p_nickname text default null,
  p_days integer default null, p_level integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  hash text;
  entry buddy_private.entries%rowtype;
  quota buddy_private.budget%rowtype;
  result jsonb;
  retry integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or p_action is null or p_action not in ('join','read','submit','leave') then
    return jsonb_build_object('status','invalid');
  end if;
  -- SHA-256 of a cryptographically random 256-bit capability. Never return hashes or tokens.
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  -- One shared row serializes admissions, registrations and per-user operations.
  select * into quota from buddy_private.budget where id = true for update;
  if not found then return jsonb_build_object('status','budget','retry_after',86400); end if;
  select * into entry from buddy_private.entries where token_hash = hash;
  -- Privacy deletion remains available when the community request allowance is exhausted.
  if p_action = 'leave' then
    delete from buddy_private.entries where token_hash = hash;
    return jsonb_build_object('status','ok');
  end if;
  if quota.month <> date_trunc('month',now())::date then
    update buddy_private.budget set month = date_trunc('month',now())::date, requests = 0 where id = true;
    quota.requests := 0;
  end if;
  retry := greatest(60,ceil(extract(epoch from (date_trunc('month',now()) + interval '1 month' - now())))::integer);
  if not quota.enabled or quota.requests >= quota.request_limit then
    return jsonb_build_object('status','budget','retry_after',case when quota.enabled then retry else 86400 end);
  end if;
  update buddy_private.budget set requests = requests + 1 where id = true;
  if p_action in ('join','submit') then
    if p_days is null or p_days not between 0 and 36500 or p_level is null or p_level not between 1 and 100 then
      return jsonb_build_object('status','invalid');
    end if;
    if p_action = 'join' then
      if p_nickname is null or p_nickname !~ '^[A-Za-z0-9 _-]{2,20}$' then return jsonb_build_object('status','invalid'); end if;
      -- Idempotent: a lost response must not create a second entry or reset its rate limit.
      if entry.token_hash is not null then return jsonb_build_object('status','ok'); end if;
      if quota.registration_day <> current_date then
        update buddy_private.budget set registration_day = current_date, registrations = 0 where id = true;
        quota.registrations := 0;
      end if;
      if quota.registrations >= 50 or (select count(*) from buddy_private.entries) >= quota.member_limit then
        return jsonb_build_object('status','full','retry_after',86400);
      end if;
      insert into buddy_private.entries(token_hash,nickname,days,level) values(hash,p_nickname,p_days,p_level);
      update buddy_private.budget set registrations = registrations + 1 where id = true;
      return jsonb_build_object('status','ok');
    end if;
    if entry.token_hash is null then return jsonb_build_object('status','missing'); end if;
    if entry.updated > now() - interval '24 hours' then
      return jsonb_build_object('status','wait','retry_after',ceil(extract(epoch from entry.updated + interval '24 hours' - now())));
    end if;
    if p_days > entry.days + ceil(extract(epoch from now() - entry.updated) / 86400)::integer then
      return jsonb_build_object('status','invalid');
    end if;
    update buddy_private.entries set days = p_days, level = p_level, updated = now() where token_hash = hash;
    return jsonb_build_object('status','ok');
  end if;
  if entry.token_hash is null then return jsonb_build_object('status','missing'); end if;
  if entry.last_read > now() - interval '6 hours' then
    return jsonb_build_object('status','wait','retry_after',ceil(extract(epoch from entry.last_read + interval '6 hours' - now())));
  end if;
  update buddy_private.entries set last_read = now() where token_hash = hash;
  with ranked as (
    select token_hash, nickname, days, level, updated, rank() over(order by days desc) as rank
    from buddy_private.entries where updated > now() - interval '30 days'
  ), top_rows as (
    select nickname, days, level, updated, rank from ranked order by days desc, nickname, token_hash limit 50
  ) select jsonb_build_object('status','ok',
    'rows',coalesce((select jsonb_agg(to_jsonb(t)) from top_rows t),'[]'::jsonb),
    'me',(select jsonb_build_object('nickname',nickname,'days',days,'level',level,'updated',updated,'rank',rank)
      from ranked where token_hash = hash)) into result;
  return result;
end;
$$;
revoke all on function public.buddy_leaderboard(text,text,text,integer,integer) from public, authenticated;
grant execute on function public.buddy_leaderboard(text,text,text,integer,integer) to anon;
