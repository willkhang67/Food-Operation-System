{{ config(
    materialized='table'
) }}

with orders as (
    select * from {{ ref('fct_orders') }}
)

select
    cast(order_created_at as date) as report_date,
    count(distinct order_id) as total_orders,
    sum(total_amount) as total_sales,
    count(distinct customer_id) as unique_customers,
    sum(case when payment_status = 'paid' then total_amount else 0 end) as total_paid_sales
from orders
group by 1
order by 1 desc
