{{ config(
    materialized='table'
) }}

with order_items as (
    select * from {{ ref('fct_order_items') }}
)

select
    food_id,
    food_name,
    category_name,
    count(distinct order_id) as total_orders_containing_food,
    sum(quantity) as total_quantity_sold,
    sum(total_revenue) as total_revenue_generated
from order_items
group by 1, 2, 3
order by total_revenue_generated desc
