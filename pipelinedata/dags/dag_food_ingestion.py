# File: dags/dag_food_ingestion.py
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from datetime import datetime, timedelta
from utils.docker_wrappers import DockerTasksClass
from utils.telegram_bot import TelegramBotNotice  

bot_notice = TelegramBotNotice()

# Khởi tạo Class Docker để gọi Spark
docker_task = DockerTasksClass(
    dbt_image="dbt_runner:latest",
    spark_image="custom-spark-lakehouse:latest",
    dbt_host_path="/mnt/c/food-operation-system/Food-Operation-System/pipelinedata/dbt_trino",
    pyspark_host_path="/mnt/c/food-operation-system/Food-Operation-System/pipelinedata/spark_config/spark",
    network_mode="lakehouse-net",
    bot_notice=bot_notice
)

# Danh sách các bảng trong Supabase cần ingest
TABLES_TO_INGEST = [
    'users', 
    'categories', 
    'foods', 
    'food_images', 
    'orders', 
    'order_items', 
    'payments'
]
PG_SCHEMA = "public"

default_args = {
    'owner': 'data_engineer',
    'retries': 1,
    'retry_delay': timedelta(minutes=1),
}

with DAG(
    dag_id='elt_food_app_daily_ingestion',
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule='0 1 * * *',
    catchup=False,
    max_active_tasks=2, # Giới hạn 2 task Spark song song để tránh sập RAM
    tags=['daily', 'Supabase', 'MinIO', 'Iceberg', 'Spark', 'FoodApp'],
) as dag:

    start_task = EmptyOperator(task_id="start")
    end_task = EmptyOperator(task_id="end")
    for table_name in TABLES_TO_INGEST:
        script_args = f"ingest_to_iceberg.py --schema {PG_SCHEMA} --table {table_name}"
        task_spark_ingest = docker_task.run_spark_task(
            task_id=f'spark_ingest_{table_name}',
            spark_script=script_args,
            dag=dag
        )

        start_task >> task_spark_ingest >> end_task
