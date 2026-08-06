{{ config(
    materialized='table'
) }}

with users as (
    select * from {{ ref('stg_users') }}
)

select
    user_id,
    email,
    role,
    full_name,
    phone_number,
    created_at
from users
