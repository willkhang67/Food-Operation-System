{{ config(
    materialized='table'
) }}

with order_items as (
    select * from {{ ref('stg_order_items') }}
),
orders as (
    select * from {{ ref('stg_orders') }}
),
foods as (
    select * from {{ ref('dim_foods') }}
)

select
    oi.order_item_id,
    oi.order_id,
    o.customer_id,
    o.created_at as order_created_at,
    oi.food_id,
    f.food_name,
    f.category_name,
    oi.quantity,
    oi.price as unit_price,
    (oi.quantity * oi.price) as total_revenue
from order_items oi
join orders o on oi.order_id = o.order_id
left join foods f on oi.food_id = f.food_id
