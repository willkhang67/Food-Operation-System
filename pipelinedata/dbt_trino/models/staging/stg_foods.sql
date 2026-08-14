{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'foods') }}
)

select
    id as food_id,
    category_id,
    name as food_name,
    description as food_description,
    price,
    is_available,
    created_at,
    updated_at
from source
