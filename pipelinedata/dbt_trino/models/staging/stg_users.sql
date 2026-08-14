{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'users') }}
)

select
    id as user_id,
    email,
    role,
    phone_number,
    full_name,
    created_at,
    updated_at
from source
