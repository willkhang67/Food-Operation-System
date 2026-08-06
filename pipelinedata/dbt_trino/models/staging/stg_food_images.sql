{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'food_images') }}
)

select
    id as image_id,
    food_id,
    url as image_url,
    is_primary,
    created_at,
    updated_at
from source
