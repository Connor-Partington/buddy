-- Keep externally submitted nicknames compatible with the extension's display validation.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'buddy_nickname_trimmed'
    and conrelid = 'buddy_private.entries'::regclass) then
    alter table buddy_private.entries add constraint buddy_nickname_trimmed
      check (nickname = btrim(nickname) and length(btrim(nickname)) >= 2);
  end if;
end $$;
