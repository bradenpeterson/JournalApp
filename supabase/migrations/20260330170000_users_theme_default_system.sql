-- New rows follow OS/browser until the user picks light or dark.
alter table public.users alter column theme set default 'system';

update public.users set theme = 'system' where theme is null;
