{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'categories') }}
)

select
    id as category_id,
    name as category_name,
    description as category_description,
    image_url,
    created_at,
    updated_at
from source
