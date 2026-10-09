revoke all on table public.aa_profiles, public.aa_groups, public.aa_group_members,
  public.aa_resources, public.aa_resource_email_rules, public.aa_resource_group_rules,
  public.aa_audit_log from anon;
grant select on table public.aa_resources to anon;
