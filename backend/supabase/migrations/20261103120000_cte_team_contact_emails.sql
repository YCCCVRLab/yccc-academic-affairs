-- Add the missing contact links to the migrated CTE team cards and include the
-- new instructional designer. The public renderer also normalizes older content
-- so existing published pages show the same contacts before this migration runs.

do $migration$
declare
  page_html text;
  fixed_html text;
  thomas_card text := E'\n      <article class="mini-card"><h3>Thomas Jarmusz</h3><p>Instructional Designer.</p><a href="mailto:tjarmusz@mainecc.edu">tjarmusz@mainecc.edu</a></article>';
begin
  select blocks->0->>'html'
    into page_html
    from public.aa_site_pages
   where slug = 'teaching-excellence';

  if page_html is null then
    return;
  end if;

  fixed_html := page_html;

  fixed_html := replace(
    fixed_html,
    $old$<article class="mini-card"><h3>Chris Watkinson</h3><p>Workforce Instructional Designer and Brightspace LMS administrator for workforce development, trainings, and apprenticeship programs.</p></article>$old$,
    $new$<article class="mini-card"><h3>Chris Watkinson</h3><p>Workforce Instructional Designer and Brightspace LMS administrator for workforce development, trainings, and apprenticeship programs.</p><a href="mailto:cwatkinson@mainecc.edu">cwatkinson@mainecc.edu</a></article>$new$
  );

  fixed_html := replace(
    fixed_html,
    $old$<article class="mini-card"><h3>M. Wendy West</h3><p>Librarian. Collaborates with faculty and students on information literacy, research, and classroom resources.</p><a href="https://www.yccc.edu/" target="_blank" rel="noopener">YCCC resources ↗</a></article>$old$,
    $new$<article class="mini-card"><h3>M. Wendy West</h3><p>Librarian. Collaborates with faculty and students on information literacy, research, and classroom resources.</p><a href="mailto:wwest@mainecc.edu">wwest@mainecc.edu</a></article>$new$
  );

  fixed_html := replace(
    fixed_html,
    $old$<article class="mini-card"><h3>John Barr</h3><p>Simulation and Learning Technology Specialist. Supports learning technology, simulation, web, AI, and immersive learning projects.</p></article>$old$,
    $new$<article class="mini-card"><h3>John Barr</h3><p>Simulation and Learning Technology Specialist. Supports learning technology, simulation, web, AI, and immersive learning projects.</p><a href="mailto:john.barr@mainecc.edu">john.barr@mainecc.edu</a></article>$new$ || case when position('Thomas Jarmusz' in fixed_html) = 0 then thomas_card else '' end
  );

  if fixed_html <> page_html then
    update public.aa_site_pages
       set blocks = jsonb_set(blocks, '{0,html}', to_jsonb(fixed_html)),
           updated_at = now()
     where slug = 'teaching-excellence';
  end if;
end
$migration$;
