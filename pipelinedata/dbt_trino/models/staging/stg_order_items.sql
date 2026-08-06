{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'order_items') }}
)

select
    id as order_item_id,
    order_id,
    food_id,
    quantity,
    price,
    created_at,
    updated_at
from source
