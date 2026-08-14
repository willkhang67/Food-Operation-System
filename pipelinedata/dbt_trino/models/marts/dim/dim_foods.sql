{{ config(
    materialized='table'
) }}

with foods as (
    select * from {{ ref('stg_foods') }}
),
categories as (
    select * from {{ ref('stg_categories') }}
)

select
    f.food_id,
    f.food_name,
    f.food_description,
    f.price,
    f.is_available,
    c.category_id,
    c.category_name
from foods f
left join categories c on f.category_id = c.category_id
