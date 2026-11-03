-- Continue the Academic Affairs migration: enrich the thin CTE/Brightspace pages,
-- replace the remaining faculty-resource placeholders with content from the old
-- Academic Affairs site, and add official YCCC/CTE brand imagery to the two hub pages.
-- Sources: migration/source/pages/ and the live legacy pages linked below.

do $migration$
begin

  -- Faculty Resources: branded Academic Affairs banner and a focused entry point.
  update public.aa_site_pages
  set blocks = jsonb_set(
        blocks,
        '{0,html}',
        to_jsonb($visual$
    <div class="content-card" style="padding:0;overflow:hidden;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:stretch;margin:0 0 20px">
      <div style="padding:26px 28px;background:linear-gradient(135deg,#0a2240,#0e4d7e);color:#fff">
        <p class="eyebrow" style="color:#d9f4ff;margin:0 0 6px">Faculty Resources</p>
        <h3 style="margin:0 0 8px;font-size:25px;line-height:1.15;color:#fff">The right resource for the moment</h3>
        <p style="margin:0 0 14px;color:#e5f0f7;line-height:1.55">Start with advising, assessment access, Brightspace, or the Faculty Toolbox. Each path opens a focused set of current resources.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px 16px">
          <a class="action-link" style="color:#fff" href="#/faculty-resources/faculty-advising">Faculty Advising →</a>
          <a class="action-link" style="color:#fff" href="#/faculty-resources/assessment-data">Assessment Data →</a>
          <a class="action-link" style="color:#fff" href="#/faculty-resources/brightspace-support">Brightspace Support →</a>
        </div>
      </div>
      <img src="https://libapps.s3.amazonaws.com/accounts/11631/images/AA_Banner_2.jpg" alt="Academic Affairs at York County Community College" style="width:100%;height:100%;min-height:230px;object-fit:cover">
    </div>
        $visual$ || (blocks->0->>'html'))
      ),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'faculty-resources';

  -- Center for Teaching Excellence: official CTE mark and a concise visual lead.
  update public.aa_site_pages
  set blocks = jsonb_set(
        blocks,
        '{0,html}',
        to_jsonb($visual$
    <div class="content-card" style="padding:0;overflow:hidden;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:stretch;margin:0 0 20px">
      <div style="padding:26px 28px;background:linear-gradient(135deg,#0a2240,#0e4d7e);color:#fff">
        <p class="eyebrow" style="color:#d9f4ff;margin:0 0 6px">Center for Teaching Excellence</p>
        <h3 style="margin:0 0 8px;font-size:25px;line-height:1.15;color:#fff">Support for every course format</h3>
        <p style="margin:0 0 14px;color:#e5f0f7;line-height:1.55">Brightspace, assessment, accessibility, course design, and professional learning—organized so you can find the next useful step.</p>
        <a class="action-link" style="color:#fff" href="#/faculty-resources/faculty-toolbox">Open the Faculty Toolbox →</a>
      </div>
      <img src="https://d2jv02qf7xgjwx.cloudfront.net/accounts/388328/images/CTE_Logo_save.png" alt="Center for Teaching Excellence" style="width:100%;height:100%;min-height:230px;object-fit:contain;background:#fff;padding:18px">
    </div>
        $visual$ || (blocks->0->>'html'))
      ),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'teaching-excellence';

  -- Brightspace Support: the full beginner-to-advanced pathway from the old page.
  update public.aa_site_pages
  set summary = 'Brightspace guidance for course setup, grades, assignments, quizzes, rubrics, and advanced tools.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Brightspace Support</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Brightspace Support</h2></div><a class="outline-button" href="https://mccs.brightspace.com/d2l/login" target="_blank" rel="noopener">Open Brightspace ↗</a></div>
    <p class="lead">Brightspace is YCCC's learning management system. Every course, whether online, on campus, or hybrid, must have the syllabus posted and the gradebook kept current. Online and hybrid courses require more extensive use; on-campus courses should still use Brightspace for the syllabus, grades, and course materials.</p>
    <div class="module-card-grid">
      <a class="module-card" href="#/faculty-resources/quickstart"><span class="module-icon">▶</span><div><strong>QuickStart videos</strong><p>Short, task-focused tutorials for common Brightspace workflows.</p></div><b>›</b></a>
      <a class="module-card" href="https://community.d2l.com/brightspace/" target="_blank" rel="noopener"><span class="module-icon">?</span><div><strong>Brightspace Community</strong><p>Official D2L help articles, release notes, and peer guidance.</p></div><b>›</b></a>
      <a class="module-card" href="mailto:ycccCTEsupport@mainecc.edu"><span class="module-icon">✉</span><div><strong>CTE support</strong><p>Ask the YCCC Center for Teaching Excellence for help with your course.</p></div><b>›</b></a>
    </div>
    <div class="link-columns">
      <div><h3>Start here</h3><ul class="resource-links">
        <li><a href="https://community.desire2learn.com/d2l/home/14828" target="_blank" rel="noopener">Brightspace Training for Instructors</a><span class="link-note">D2L's open training course for the basics.</span></li>
        <li><a href="https://community.d2l.com/brightspace/kb/articles/5539-navigate-brightspace-and-find-your-course" target="_blank" rel="noopener">Find your course</a><span class="link-note">Sign in, navigate Brightspace, and locate your course.</span></li>
        <li><a href="https://community.d2l.com/brightspace/" target="_blank" rel="noopener">Browse Brightspace help</a><span class="link-note">Current articles for grades, assignments, quizzes, and course setup.</span></li>
        <li><a href="https://community.d2l.com/brightspace/kb/articles/5798-create-a-rubric-using-the-rubrics-tool" target="_blank" rel="noopener">Create a rubric</a><span class="link-note">Build a rubric in Brightspace to assess student learning.</span></li>
      </ul></div>
      <div><h3>Build your course</h3><ul class="resource-links">
        <li><a href="https://community.d2l.com/brightspace/kb/articles/19013-about-awards" target="_blank" rel="noopener">Class Awards</a><span class="link-note">Recognize student achievement with badges and certificates.</span></li>
        <li><a href="https://community.d2l.com/brightspace/kb/articles/3499-about-intelligent-agents" target="_blank" rel="noopener">Intelligent Agents</a><span class="link-note">Automate routine communications and course tasks.</span></li>
        <li><a href="https://www.youtube.com/watch?v=gn5yhMgJH1E" target="_blank" rel="noopener">Creator+ overview</a><span class="link-note">Watch a short introduction to Creator+ features.</span></li>
        <li><a href="https://community.d2l.com/brightspace/events/" target="_blank" rel="noopener">Brightspace events and Q&amp;A</a><span class="link-note">Join live sessions and ask D2L experts questions.</span></li>
      </ul></div>
    </div>
    <aside class="cms-callout warning"><strong>Using third-party tools?</strong> Use LTI 1.3 links for products such as Cengage MindTap, McGraw Hill Connect, and Labster. If a course shows a “Broken Topic,” contact <a href="mailto:ycccCTEsupport@mainecc.edu">ycccCTEsupport@mainecc.edu</a>.</aside>
    <p class="muted">Need help choosing a tool or redesigning an activity? The <a href="#/teaching-excellence">Center for Teaching Excellence</a> can help with course design, accessibility, and assessment.</p>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'brightspace-support';

  -- Instructional Strategies: workshops and research-based practices from the old page.
  update public.aa_site_pages
  set summary = 'Research-based teaching practices, universal design, backward design, and assessment resources.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Center for Teaching Excellence</span><b>›</b><strong>Instructional Strategies</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">CTE Module</p><h2>Instructional Strategies</h2></div><a class="outline-button" href="mailto:ycccCTEsupport@mainecc.edu">Ask CTE</a></div>
    <p class="lead">Use this page to develop as an instructor. Start with one evidence-based change, then explore workshop recordings, assessment guidance, and practical resources for online and in-person teaching.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Universal Design for Learning</h3><p>Design flexible learning experiences that reduce barriers and give students multiple ways to engage, learn, and show what they know.</p><a class="action-link" href="https://dl.sps.northwestern.edu/blog/2018/02/five-ways-incorporate-universal-design-learning-online-course/" target="_blank" rel="noopener">Read the UDL guide ↗</a></article>
      <article class="content-card"><h3>Backward design</h3><p>Start with the learning outcomes, then choose the evidence and learning activities that make success possible.</p><a class="action-link" href="https://teaching.resources.osu.edu/teaching-topics/using-backward-design-plan-your" target="_blank" rel="noopener">Plan with backward design ↗</a></article>
      <article class="content-card"><h3>Plain language</h3><p>Clear directions, announcements, and assignment prompts help every student understand what is expected.</p><a class="action-link" href="https://www.plainlanguage.gov/guidelines/" target="_blank" rel="noopener">Open federal guidelines ↗</a></article>
      <article class="content-card"><h3>Accessibility toolkit</h3><p>Check documents, video, web content, and course communications against practical accessibility guidance.</p><a class="action-link" href="https://accessibledigitallearning.org/resource/accessibility-toolkit" target="_blank" rel="noopener">Open the toolkit ↗</a></article>
    </div>
    <div class="link-columns">
      <div><h3>Workshops and assessment</h3><ul class="resource-links">
        <li><a href="#/teaching-excellence/rubrics">Rubrics and assessment resources</a><span class="link-note">Examples, templates, and Brightspace guidance.</span></li>
        <li><a href="https://www.learningguild.com/olfarchives/1994/evaluation-and-assessment-measure-what-matters/" target="_blank" rel="noopener">Evaluation and assessment: measure what matters</a><span class="link-note">Learning Guild webinar on assessment and course effectiveness.</span></li>
        <li><a href="https://yccc0.sharepoint.com/:b:/r/sites/YCCCAcademicAffairs/Shared%20Documents/Instructor%20Guides/Example%20Rubric%202-%20argument.pdf?csf=1&amp;web=1&amp;e=NX1Xvo" target="_blank" rel="noopener">Example rubric: argumentative writing ↗</a></li>
        <li><a href="https://yccc0.sharepoint.com/:b:/s/YCCCAcademicAffairs/EeuIcKTIMhFKrRPpvZH5F90Bndv5S03qvIYveQQpwwA4Gg?e=X2Haya" target="_blank" rel="noopener">Example rubric: discussion board ↗</a></li>
      </ul></div>
      <div><h3>Keep going</h3><ul class="resource-links">
        <li><a href="https://www.everylearnereverywhere.org/wp-content/uploads/ele_facultyplaybook_2021_v3a_gc.pdf" target="_blank" rel="noopener">Optimizing high-quality digital learning experiences</a><span class="link-note">OLC faculty playbook on equitable course design, OER, and assessment.</span></li>
        <li><a href="#/faculty-resources/faculty-toolbox">Faculty Toolbox</a><span class="link-note">Media, accessibility, assessment, and virtual-classroom tools.</span></li>
        <li><a href="#/faculty-resources/brightspace-support">Brightspace Support</a><span class="link-note">Course setup, grades, assignments, and advanced Brightspace features.</span></li>
        <li><a href="mailto:ycccCTEsupport@mainecc.edu">Email CTE Support</a><span class="link-note">Ask for a consultation or workshop follow-up.</span></li>
      </ul></div>
    </div>
    <aside class="cms-callout info"><strong>Start small:</strong> Pick one assignment or one week of a course, apply a single strategy, and review what changed for students. CTE can help you plan the next iteration.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'instructional-strategies';

  -- YC Course Materials: planning, resource selection, and Brightspace integrations.
  update public.aa_site_pages
  set summary = 'Course planning, free and paid learning resources, and Brightspace integrations.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Center for Teaching Excellence</span><b>›</b><strong>YC Course Materials</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">CTE Module</p><h2>YC Course Materials</h2></div><a class="outline-button" href="mailto:ycccCTEsupport@mainecc.edu">Ask CTE</a></div>
    <p class="lead">Prepare a course for a new term, choose materials that keep costs and access in view, and connect publisher tools to Brightspace. If a resource asks you to sign in, use your YCCC Microsoft 365 account.</p>
    <div class="module-card-grid">
      <a class="module-card" href="https://yccc0.sharepoint.com/:w:/s/YCCCAcademicAffairs/EYVMtvNxQ5hImB8h5HMsdOIBg7MzYNGxqQcPv_NCjVWeTw?e=n8CUBm" target="_blank" rel="noopener"><span class="module-icon">16</span><div><strong>16-week course planner</strong><p>Plan the term after you have identified the primary learning resources.</p></div><b>›</b></a>
      <a class="module-card" href="https://yccc0.sharepoint.com/:w:/s/YCCCAcademicAffairs/EY0oTjdvj19Fii8guet5fYkBuJqQ5F_s6wIDaDod_2rx2A?e=jta3Vs" target="_blank" rel="noopener"><span class="module-icon">7</span><div><strong>7-week course planner</strong><p>Use the shorter template for accelerated terms and compressed schedules.</p></div><b>›</b></a>
      <a class="module-card" href="https://yccc0.sharepoint.com/:v:/s/YCCCAcademicAffairs/Efr3F02rH-NAiKsAV1bMgZwB4l9nU5nwj1o8FmRMrP3tCA?e=99p5vw" target="_blank" rel="noopener"><span class="module-icon">▶</span><div><strong>Master Course Template</strong><p>Watch how to find and copy the template into a new course.</p></div><b>›</b></a>
    </div>
    <div class="link-columns">
      <div><h3>Free and open resources</h3><ul class="resource-links">
        <li><a href="https://virtual.yccc.edu/library" target="_blank" rel="noopener">YCCC Library</a><span class="link-note">Start here for articles, videos, audio, and ebooks.</span></li>
        <li><a href="https://oercommons.org/" target="_blank" rel="noopener">OER Commons</a><span class="link-note">Open textbooks and reusable course materials.</span></li>
        <li><a href="https://www.merlot.org/merlot/index.htm" target="_blank" rel="noopener">MERLOT</a><span class="link-note">Peer-reviewed open resources across disciplines.</span></li>
        <li><a href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noopener">Creative Commons licenses</a><span class="link-note">Understand how open materials can be reused and adapted.</span></li>
      </ul></div>
      <div><h3>Publisher and paid resources</h3><ul class="resource-links">
        <li><a href="https://www.cengage.com/coursepages/YorkCountyCC_YourCengageTeam" target="_blank" rel="noopener">Cengage</a><span class="link-note">YCCC's Cengage team, products, and course support.</span></li>
        <li><a href="https://www.vitalsource.com/" target="_blank" rel="noopener">VitalSource</a><span class="link-note">Digital textbooks and courseware from major publishers.</span></li>
        <li><a href="https://www.pearson.com/en-us/higher-education/educators/training-and-support/instructor-resources.html" target="_blank" rel="noopener">Pearson instructor resources</a><span class="link-note">MyLab, Mastering, e-textbooks, and support.</span></li>
        <li><a href="https://www.labster.com/resources" target="_blank" rel="noopener">Labster</a><span class="link-note">Virtual lab simulations and instructor resources.</span></li>
      </ul></div>
    </div>
    <div class="link-columns">
      <div><h3>Connect tools to Brightspace</h3><ul class="resource-links">
        <li><a href="https://help.pearsoncmg.com/integration/cg/instructor/content/get_started-bs-13.htm#Step3" target="_blank" rel="noopener">Pearson in Brightspace</a></li>
        <li><a href="https://www.cengage.com/training/mindtap/brightspace/" target="_blank" rel="noopener">Cengage MindTap in Brightspace</a></li>
        <li><a href="https://help.labster.com/en/articles/6066267-brightspace-d2l-how-to-add-labster-simulations-to-your-course-lti-1-3" target="_blank" rel="noopener">Labster in Brightspace</a></li>
        <li><a href="https://virtual.yccc.edu/ld.php?content_id=56979005" target="_blank" rel="noopener">Copying course content</a><span class="link-note">Copy only the components and data you need for the new term.</span></li>
      </ul></div>
      <div><h3>Course materials and syllabus</h3><ul class="resource-links">
        <li><a href="https://virtual.yccc.edu/ld.php?content_id=77553695" target="_blank" rel="noopener">YCCC Syllabus Template V6</a><span class="link-note">ADA-compliant template with current college policy language.</span></li>
        <li><a href="#/teaching-excellence/syllabus-creation">Syllabus Creation</a><span class="link-note">A learning-centered syllabus checklist.</span></li>
        <li><a href="#/faculty-resources/brightspace-support">Brightspace Support</a><span class="link-note">Course setup, grades, assignments, and advanced tools.</span></li>
        <li><a href="mailto:ycccCTEsupport@mainecc.edu">Ask CTE about course materials</a></li>
      </ul></div>
    </div>
    <aside class="cms-callout info"><strong>Keep student cost in view:</strong> Use library and OER materials first when they meet the outcomes. If a paid resource is necessary, use it throughout the course and make access requirements clear before registration.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'course-materials';

  -- Rubrics & Assessment: examples, templates, and external guidance.
  update public.aa_site_pages
  set summary = 'Rubric examples, templates, design guidance, and Brightspace assessment tools.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Center for Teaching Excellence</span><b>›</b><strong>Rubrics &amp; Assessment</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">CTE Module</p><h2>Rubrics &amp; Assessment</h2></div><a class="outline-button" href="mailto:ycccCTEsupport@mainecc.edu">Ask CTE</a></div>
    <p class="lead">A rubric is a list of criteria and descriptions of performance. Good rubrics make expectations visible, support consistent grading, and give students useful feedback they can act on.</p>
    <div class="module-card-grid">
      <a class="module-card" href="https://yccc0.sharepoint.com/:b:/s/YCCCAcademicAffairs/Ef5oFpa2Z51Gj_n-iAzALa8BBNm8z5-q9Fn7xOHHekJ1Lw?e=HlyGcS" target="_blank" rel="noopener"><span class="module-icon">1</span><div><strong>Argumentative writing example</strong><p>See how criteria and performance levels fit together.</p></div><b>›</b></a>
      <a class="module-card" href="https://yccc0.sharepoint.com/:b:/s/YCCCAcademicAffairs/EeuIcKTIMhFKrRPpvZH5F90Bndv5S03qvIYveQQpwwA4Gg?e=X2Haya" target="_blank" rel="noopener"><span class="module-icon">2</span><div><strong>Discussion board example</strong><p>Review a sample rubric for online discussion.</p></div><b>›</b></a>
      <a class="module-card" href="https://yccc0-my.sharepoint.com/:p:/g/personal/jdufort_yccc_edu/Ebh81kceqZhOnBk5LzPGKCEB9hQxINgKDmYyhHACYmdHXA?e=plZbWU" target="_blank" rel="noopener"><span class="module-icon">3</span><div><strong>Rubric workshop deck</strong><p>Walk through rubric design with the CTE workshop slides.</p></div><b>›</b></a>
      <a class="module-card" href="https://yccc0-my.sharepoint.com/:w:/g/personal/jdufort_yccc_edu/EQDetvMt32RPgw_g3khfkzkBgXdyotjKPucEn883Us_v8g?e=XRHQmg" target="_blank" rel="noopener"><span class="module-icon">4</span><div><strong>Blank rubric template</strong><p>Start a new rubric with a consistent structure.</p></div><b>›</b></a>
    </div>
    <div class="link-columns">
      <div><h3>Build in Brightspace</h3><ul class="resource-links">
        <li><a href="https://community.d2l.com/brightspace/kb/articles/5798-create-a-rubric-using-the-rubrics-tool" target="_blank" rel="noopener">Create a rubric in Brightspace</a><span class="link-note">Add criteria and levels, then attach the rubric to an activity.</span></li>
        <li><a href="#/teaching-excellence/instructional-strategies">Assessment and instructional strategies</a><span class="link-note">Connect assessment choices to course outcomes.</span></li>
        <li><a href="#/faculty-resources/brightspace-support">Brightspace Support</a><span class="link-note">Grades, assignments, quizzes, and advanced tools.</span></li>
      </ul></div>
      <div><h3>More rubric resources</h3><ul class="resource-links">
        <li><a href="https://www.facultyfocus.com/articles/teaching-and-learning/should-you-be-using-rubrics/" target="_blank" rel="noopener">Should you be using rubrics?</a></li>
        <li><a href="https://rubistar.4teachers.org/" target="_blank" rel="noopener">RubiStar rubric generator</a></li>
        <li><a href="https://www.rcampus.com/indexrubric.cfm" target="_blank" rel="noopener">iRubric generator</a></li>
        <li><a href="https://www.fresnostate.edu/academics/oie/assessment/rubric.html" target="_blank" rel="noopener">Fresno State rubric library</a></li>
      </ul></div>
    </div>
    <aside class="cms-callout info"><strong>Make it useful:</strong> Keep the criteria focused on the learning outcomes, describe what quality looks like at each level, and share the rubric before students begin the assignment.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'rubrics';

  -- Syllabus Creation: template plus the learning-centered checklist from the old page.
  update public.aa_site_pages
  set summary = 'Current YCCC syllabus template and a learning-centered syllabus checklist.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Center for Teaching Excellence</span><b>›</b><strong>Syllabus Creation</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">CTE Module</p><h2>Syllabus Creation</h2></div><a class="outline-button" href="https://virtual.yccc.edu/ld.php?content_id=77553695" target="_blank" rel="noopener">Open the template ↗</a></div>
    <p class="lead">Use the current YCCC template so students get the right college policies, contacts, and course information. A learning-centered syllabus is also a roadmap: it explains what students will learn, how they will be assessed, and how to succeed.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Current syllabus template</h3><p>YCCC Syllabus Template V6 is ADA-compliant and includes the required college policy language.</p><a class="action-link" href="https://virtual.yccc.edu/ld.php?content_id=77553695" target="_blank" rel="noopener">Open template ↗</a></article>
      <article class="content-card"><h3>Submit a completed copy</h3><p>Send the completed syllabus to <a href="mailto:YCCCsyllabi@mainecc.edu">YCCCsyllabi@mainecc.edu</a> by the first day of the term.</p></article>
    </div>
    <h3>Build a learning-centered syllabus</h3>
    <p>Use these questions as a final check before you share the syllabus with students:</p>
    <ul class="resource-links">
      <li>Does the syllabus provide the information students need to succeed in the course?</li>
      <li>Does it use the current YCCC template and current policy and contact information?</li>
      <li>Does it encourage students to take personal responsibility for their learning?</li>
      <li>Does it communicate key assignments and due dates so students can plan?</li>
      <li>Does it state clear learning outcomes and high expectations for learning?</li>
      <li>Are there sections from the sample syllabi that would work well in this course?</li>
    </ul>
    <aside class="cms-callout info"><strong>Need a syllabus review?</strong> CTE can review outcomes, assessment alignment, accessibility, and the student-facing language. Email <a href="mailto:ycccCTEsupport@mainecc.edu">ycccCTEsupport@mainecc.edu</a>.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'syllabus-creation';

  -- Online Teaching: a practical start-to-finish path for online and hybrid courses.
  update public.aa_site_pages
  set summary = 'Practical guidance for designing and teaching online or hybrid courses.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Online Teaching</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Online Teaching</h2></div><a class="outline-button" href="#/faculty-resources/brightspace-support">Brightspace Support</a></div>
    <p class="lead">Online and hybrid teaching work best when the course structure, communication, and support are intentional. Use these starting points before the term, during the term, and when you need help.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Before the term</h3><p>Post the syllabus, organize modules in a predictable order, set up the gradebook, and check that every required tool opens correctly.</p><a class="action-link" href="#/faculty-resources/quickstart">Open QuickStart videos</a></article>
      <article class="content-card"><h3>During the term</h3><p>Use announcements and assignment feedback to keep students oriented. Check the gradebook regularly and follow through on Early Alert concerns.</p><a class="action-link" href="#/forms/early-alert">Open Early Alert</a></article>
      <article class="content-card"><h3>When something breaks</h3><p>For Brightspace errors, use the Brightspace Community or contact CTE Support. For student barriers outside class, use the Care Team.</p><a class="action-link" href="#/forms/care-team">Open Care Team</a></article>
    </div>
    <div class="link-columns">
      <div><h3>Teaching tools</h3><ul class="resource-links">
        <li><a href="#/faculty-resources/brightspace-support">Brightspace Support</a><span class="link-note">Course setup, grades, assignments, quizzes, rubrics, and advanced tools.</span></li>
        <li><a href="#/faculty-resources/quickstart">Brightspace QuickStart</a><span class="link-note">Short task-focused videos and training.</span></li>
        <li><a href="#/faculty-resources/faculty-toolbox">Faculty Toolbox</a><span class="link-note">Media, accessibility, assessment, and virtual-classroom tools.</span></li>
        <li><a href="#/teaching-excellence/instructional-strategies">Instructional Strategies</a><span class="link-note">UDL, backward design, and practical teaching resources.</span></li>
      </ul></div>
      <div><h3>Student support</h3><ul class="resource-links">
        <li><a href="#/student-success">Student Success Commons</a><span class="link-note">Tutoring, coaching, library, accessibility, and help.</span></li>
        <li><a href="#/forms/early-alert">Early Alert</a><span class="link-note">Academic concerns: attendance, missing work, or grades.</span></li>
        <li><a href="#/forms/care-team">Care Team</a><span class="link-note">Mental health, food insecurity, transportation, and other barriers.</span></li>
        <li><a href="mailto:ycccCTEsupport@mainecc.edu">Email CTE Support</a><span class="link-note">Course design, Brightspace, and teaching consultation.</span></li>
      </ul></div>
    </div>
    <aside class="cms-callout info"><strong>Design for the students who are not in the room:</strong> Make directions explicit, keep the weekly rhythm predictable, and give students more than one way to ask for help.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'online-teaching';

  -- Academic Internships: content from the legacy Internships guide.
  update public.aa_site_pages
  set summary = 'Faculty-facing internship requirements, student eligibility, and program areas.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Academic Internships</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Academic Internships</h2></div><a class="outline-button" href="mailto:acrampton@mainecc.edu">Contact the Academic Dean</a></div>
    <p class="lead">An academic internship is a curriculum-based, supervised work experience that enhances student learning. Students earn college credit through a faculty-sponsored experience guided by learning objectives, a YCCC faculty sponsor, and a qualified site supervisor at an approved work site.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>What qualifies</h3><p>Internships are semester experiences requiring at least 135 work-site hours for a 3-credit internship. Credit comes from the work-site experience plus academic work assigned by the faculty sponsor.</p></article>
      <article class="content-card"><h3>Student eligibility</h3><p>Students must be matriculated in a degree program and meet the program's prerequisites. At minimum, YCCC requires a 3.0 cumulative GPA, 30 earned credits in the program, and permission of the Academic Dean.</p></article>
    </div>
    <h3>Program areas</h3>
    <p>Academic internships are available across the college, including:</p>
    <div class="link-columns">
      <div><ul class="resource-links">
        <li>Accounting</li><li>Architecture &amp; Engineering Design</li><li>Business Administration</li><li>Computer Aided Design</li><li>Computer Technology</li><li>Criminal Justice</li><li>Culinary Arts</li>
      </ul></div>
      <div><ul class="resource-links">
        <li>Digital Media</li><li>Hospitality &amp; Tourism</li><li>Museum Internship</li><li>Political Science</li><li>Precision Machining Technology</li><li>Psychology &amp; Advanced Psychology</li><li>Writing/Communications</li>
      </ul></div>
    </div>
    <h3>Key requirements</h3>
    <ul class="resource-links">
      <li>The internship must be a substantially different experience from any existing job duties with the same organization.</li>
      <li>Students may be paid if the work site provides that benefit.</li>
      <li>A family member cannot serve as the site supervisor, and the faculty sponsor and site supervisor must be different people.</li>
      <li>Students pay tuition for registered credits; no course fees are assessed.</li>
      <li>Credit is not awarded retroactively, and internships must begin and end within the standard academic calendar.</li>
      <li>YCCC does not offer international internships.</li>
    </ul>
    <aside class="cms-callout info"><strong>Forms and full details:</strong> The legacy internship guide maintains the Academic Internship Contract, academic assignments, site handbook, and course outlines. <a href="https://virtual.yccc.edu/internships" target="_blank" rel="noopener">Open the full internship guide ↗</a></aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'academic-internships';

  -- Articulation Agreements: a usable overview with the legacy full list.
  update public.aa_site_pages
  set summary = 'YCCC transfer agreements with four-year partners and how to confirm a pathway.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Articulation Agreements</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Articulation Agreements</h2></div><a class="outline-button" href="mailto:acrampton@mainecc.edu">Ask Academic Affairs</a></div>
    <p class="lead">Articulation agreements map YCCC programs and courses to four-year partner programs. Use them for advising conversations, but confirm the current agreement with the receiving institution before a student relies on it.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Find the program pathway</h3><p>Agreements exist across business, behavioral health, computer science, criminal justice, digital media, education, health studies, liberal studies, and technical programs.</p><a class="action-link" href="https://virtual.yccc.edu/articulations" target="_blank" rel="noopener">Open the full agreement list ↗</a></article>
      <article class="content-card"><h3>Confirm before advising</h3><p>Agreements are updated as programs and partner requirements change. Check the signed agreement and the receiving institution's current catalog.</p></article>
    </div>
    <div class="link-columns">
      <div><h3>Representative partners</h3><ul class="resource-links">
        <li>Husson University</li><li>Northeastern University, College of Professional Studies</li><li>Southern New Hampshire University</li><li>St. Joseph's College</li><li>Unity College</li><li>University of Maine, Fort Kent</li><li>University of New England</li><li>University of Southern Maine</li><li>UMass Lowell</li>
      </ul></div>
      <div><h3>Program areas with agreements</h3><ul class="resource-links">
        <li>Accounting, Business, and Finance</li><li>Animal Care &amp; Management</li><li>Architecture &amp; Engineering Design</li><li>Behavioral Health Studies and Social Work</li><li>Computer Science and Information Technology</li><li>Criminal Justice</li><li>Digital Media and Graphic Design</li><li>Education</li><li>Health Studies and Medical Assisting</li><li>Liberal Studies</li><li>Trade &amp; Technical Operations</li><li>Veterinary Technology</li>
      </ul></div>
    </div>
    <aside class="cms-callout warning"><strong>Agreements change:</strong> This page is an advising aid, not a guarantee of transfer credit. The receiving institution makes the final decision. Confirm the current signed agreement and catalog requirements before a student registers.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'articulations';

  -- Gender Equity: content from the legacy Gender Equity guide.
  update public.aa_site_pages
  set summary = 'Supporting students in nontraditional fields and gender-equity resources at YCCC.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Gender Equity</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Gender Equity</h2></div><a class="outline-button" href="https://virtual.yccc.edu/GenderEquity" target="_blank" rel="noopener">Legacy resource page ↗</a></div>
    <p class="lead">YCCC's Gender Equity program supports students enrolled in fields that are nontraditional for their gender—occupations in which less than 25% of one gender is enrolled or employed. The goal is the same educational and professional opportunity in every field.</p>
    <div class="link-columns">
      <div><h3>Nontraditional fields for women</h3><ul class="resource-links">
        <li>Business Administration and Finance</li><li>Criminal Justice</li><li>Precision Machining Technology</li><li>Culinary Arts and Baking &amp; Pastry</li><li>Architectural &amp; Engineering Design</li><li>Computer Science and Information Technology</li><li>Trade and Technical Occupations</li>
      </ul></div>
      <div><h3>Nontraditional fields for men</h3><ul class="resource-links">
        <li>Education</li><li>Health Studies</li><li>Veterinary Technology</li><li>Medical Assisting</li><li>Nursing</li>
      </ul></div>
    </div>
    <h3>What the program offers</h3>
    <ul class="resource-links">
      <li>A supportive environment for students in nontraditional programs</li>
      <li>Educational programs that empower men and women</li>
      <li>Resources on gender-equity issues</li>
      <li>Scholarship and grant information</li>
      <li>Information on community and national events</li>
      <li>Faculty who can help students succeed</li>
    </ul>
    <aside class="cms-callout info"><strong>Interested in a nontraditional field?</strong> Contact the department chair for the program or <a href="mailto:acrampton@mainecc.edu">Academic Affairs</a> for help getting started.</aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'gender-equity';

  -- Prior Learning Assessment: pathways, limits, and examples from the legacy guide.
  update public.aa_site_pages
  set summary = 'Pathways for earning credit for college-level learning outside the traditional classroom.',
      blocks = jsonb_build_array(jsonb_build_object(
        'type', 'legacy_html',
        'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Prior Learning Assessment</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Prior Learning Assessment</h2></div><a class="outline-button" href="https://virtual.yccc.edu/priorlearning" target="_blank" rel="noopener">Legacy resource page ↗</a></div>
    <p class="lead">YCCC recognizes learning that happens outside the traditional classroom—through work and volunteer experience, military training, workshops, professional certifications, and other approved pathways. Students must be formally admitted to a degree program and meet the program residency requirement.</p>
    <aside class="cms-callout warning"><strong>Credit limits:</strong> Students may earn up to 75% of the credits required for graduation through all forms of prior learning combined. At least 25% of program credit hours must be completed directly through YCCC. Prior-learning credits count toward requirements but are not included in the GPA.</aside>
    <h3>Prior learning options</h3>
    <div class="link-columns">
      <div><ul class="resource-links">
        <li>Articulation agreements</li><li>Dual or concurrent enrollment</li><li>Military experience and training (ACE-evaluated)</li><li>Portfolio development</li><li>Professional certifications</li>
      </ul></div>
      <div><ul class="resource-links">
        <li>Registered apprenticeship programs</li><li>Standardized exams (AP, CLEP, DANTES, IB, FLATS)</li><li>Transfer credit for previous courses</li><li>Workplace training (ACE-evaluated)</li>
      </ul></div>
    </div>
    <h3>Examples of recognized credentials</h3>
    <p>YCCC's prior-learning review has recognized credentials and training including Adobe certified user credentials, Autodesk AutoCAD, Child Development Associate (CDA), Certified SolidWorks Associate, Cisco and CompTIA certifications, EMT Basic, Firefighter I and II, ISO 9001 Lead Auditor, Maine Criminal Justice Academy programs, Maine Roads to Quality credentials, MHRT-I, and ServSafe.</p>
    <aside class="cms-callout info"><strong>Start early:</strong> Requests for prior-learning credit should be made during the admissions process or shortly afterward so they can be considered in degree planning. <a href="https://virtual.yccc.edu/priorlearning" target="_blank" rel="noopener">See the full pathways and articulation list ↗</a></aside>
        $html$
      )),
      updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
      updated_at = now()
  where slug = 'prior-learning';

end
$migration$;
