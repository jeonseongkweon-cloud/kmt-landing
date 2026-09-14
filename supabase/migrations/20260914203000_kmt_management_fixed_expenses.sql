alter table public.kmt_management_entries
  drop constraint if exists kmt_management_entries_category_check;

alter table public.kmt_management_entries
  add constraint kmt_management_entries_category_check check (
    category in (
      'other_income', 'examination_fee', 'regular_expense', 'special_expense',
      'costco_hyundai_card', 'samsung_card', 'woori_card', 'water_common_electricity'
    )
  );

alter table public.kmt_management_entries
  drop constraint if exists kmt_management_entry_category_type_check;

alter table public.kmt_management_entries
  add constraint kmt_management_entry_category_type_check check (
    (entry_type = 'income' and category in ('other_income', 'examination_fee')) or
    (entry_type = 'expense' and category in (
      'regular_expense', 'special_expense', 'costco_hyundai_card',
      'samsung_card', 'woori_card', 'water_common_electricity'
    ))
  );

create unique index if not exists kmt_management_fixed_expense_month_unique
  on public.kmt_management_entries (
    category,
    (extract(year from entry_date)),
    (extract(month from entry_date))
  )
  where category in (
    'costco_hyundai_card', 'samsung_card', 'woori_card', 'water_common_electricity'
  );

comment on index public.kmt_management_fixed_expense_month_unique is
  '카드 3개와 상수도·공동전기는 동일 항목·동일 월 1건만 허용';
