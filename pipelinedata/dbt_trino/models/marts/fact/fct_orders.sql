{{ config(
    materialized='table'
) }}

with orders as (
    select * from {{ ref('stg_orders') }}
),
payments as (
    select * from {{ ref('stg_payments') }}
)

select
    o.order_id,
    o.customer_id,
    o.order_status,
    o.total_amount,
    o.created_at as order_created_at,
    p.payment_id,
    p.amount as payment_amount,
    p.payment_status,
    p.created_at as payment_created_at
from orders o
left join payments p on o.order_id = p.order_id
