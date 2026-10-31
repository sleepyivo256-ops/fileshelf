-- FileShelf Initial Seed Data for Cloudflare D1
-- Run this with: npx wrangler d1 execute fileshelf-db --file=./seed.sql

-- Initial Admin Account (email: nsimbeivan2006@gmail.com, password: @Nsimbeivan2006)
INSERT OR IGNORE INTO users (id, email, name, password_hash, role)
VALUES (1, 'nsimbeivan2006@gmail.com', 'Store Admin', '$2a$10$Y3BxeKSi9qoJCSo5bdcf2eYGHB5mdmEoghJ8is5o/QNgqkzn9a7rC', 'admin');

-- Demo Products Catalog
INSERT OR IGNORE INTO products (id, title, description, category, price_ugx, file_format, cover_path, file_path, file_name, file_size, published) VALUES
(1, 'Atomic Habits Summary Guide', 'A practical chapter-by-chapter summary of Atomic Habits with actionable worksheets to build better habits and break bad ones.', 'Books', 12000, 'PDF', '/uploads/covers/atomic-habits-summary-guide.svg', 'files/demo-atomic-habits.pdf', 'Atomic-Habits-Guide.pdf', 1048576, 1),
(2, 'Digital Marketing Masterclass', 'Full video course: social media marketing, SEO, email funnels and paid ads. Includes slides and templates.', 'Courses', 25000, 'ZIP', '/uploads/covers/digital-marketing-masterclass.svg', 'files/demo-digital-marketing.zip', 'Digital-Marketing-Masterclass.zip', 52428800, 1),
(3, 'Professional CV Template Pack', 'ATS-friendly CV and cover letter templates in editable Word format, with a guide to writing winning applications.', 'Templates', 8000, 'DOCX', '/uploads/covers/professional-cv-template-pack.svg', 'files/demo-cv-templates.docx', 'Professional-CV-Pack.docx', 524288, 1),
(4, 'Study Notes Bundle - Biology', 'Comprehensive, exam-focused Biology notes covering the full syllabus with diagrams and practice questions.', 'Notes', 10000, 'PDF', '/uploads/covers/study-notes-bundle---biology.svg', 'files/demo-biology-notes.pdf', 'Biology-Revision-Notes.pdf', 2097152, 1),
(5, 'Small Business Plan Toolkit', 'Ready-to-use business plan template, financial projections spreadsheet and investor pitch outline.', 'Templates', 15000, 'ZIP', '/uploads/covers/small-business-plan-toolkit.svg', 'files/demo-business-toolkit.zip', 'Business-Plan-Toolkit.zip', 4194304, 1),
(6, 'Personal Finance Handbook', 'Learn budgeting, saving and investing basics tailored for East Africa, with printable trackers.', 'Books', 10000, 'PDF', '/uploads/covers/personal-finance-handbook.svg', 'files/demo-finance-handbook.pdf', 'Personal-Finance-East-Africa.pdf', 1572864, 1),
(7, 'Excel for Data Analysis Course', 'From basics to pivot tables and dashboards. Includes practice datasets and certificate of completion.', 'Courses', 20000, 'ZIP', '/uploads/covers/excel-for-data-analysis-course.svg', 'files/demo-excel-course.zip', 'Excel-Data-Analysis.zip', 31457280, 1),
(8, 'Research Project Writing Guide', 'Step-by-step guide to writing research proposals, chapters 1-5, with formatting examples and citation styles.', 'Notes', 7000, 'PDF', '/uploads/covers/research-project-writing-guide.svg', 'files/demo-research-guide.pdf', 'Research-Writing-Guide.pdf', 1048576, 1);
