"""add_step17_docker_kubernetes_jenkins

Revision ID: 20260927_1417
Revises: 20260927_1253
Create Date: 2026-09-27 14:17:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '20260927_1417'
down_revision: Union[str, None] = '20260927_1253'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # container_registries
    op.create_table(
        'container_registries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('credential_reference', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_container_registries_project_id', 'container_registries', ['project_id'])

    # docker_images
    op.create_table(
        'docker_images',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('registry_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('repository', sa.String(), nullable=False),
        sa.Column('tag', sa.String(), nullable=True),
        sa.Column('digest', sa.String(), nullable=True),
        sa.Column('image_id', sa.String(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('jenkins_build_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('github_repo_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('architecture', sa.String(), nullable=True),
        sa.Column('os', sa.String(), nullable=True),
        sa.Column('size', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='DISCOVERED'),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['registry_id'], ['container_registries.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_docker_images_project_id', 'docker_images', ['project_id'])
    op.create_index('ix_docker_images_digest', 'docker_images', ['digest'])
    op.create_index('ix_docker_images_commit_sha', 'docker_images', ['commit_sha'])
    op.create_index('ix_docker_images_jenkins_build_id', 'docker_images', ['jenkins_build_id'])

    # container_image_findings
    op.create_table(
        'container_image_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('image_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scanner_execution_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('vulnerability_id', sa.String(), nullable=True),
        sa.Column('package', sa.String(), nullable=True),
        sa.Column('installed_version', sa.String(), nullable=True),
        sa.Column('fixed_version', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='OPEN'),
        sa.Column('evidence', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['image_id'], ['docker_images.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_container_image_findings_image_id', 'container_image_findings', ['image_id'])
    op.create_index('ix_container_image_findings_severity', 'container_image_findings', ['severity'])
    op.create_index('ix_container_image_findings_scanner_execution_id', 'container_image_findings', ['scanner_execution_id'])

    # kubernetes_clusters
    op.create_table(
        'kubernetes_clusters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), nullable=True),
        sa.Column('cluster_identifier', sa.String(), nullable=True),
        sa.Column('environment', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('credential_reference', sa.String(), nullable=True),
        sa.Column('namespace_scope', sa.String(), nullable=True),
        sa.Column('server_version', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kubernetes_clusters_project_id', 'kubernetes_clusters', ['project_id'])

    # kubernetes_namespaces
    op.create_table(
        'kubernetes_namespaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='ACTIVE'),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('annotations', sa.JSON(), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kubernetes_namespaces_cluster_id', 'kubernetes_namespaces', ['cluster_id'])

    # kubernetes_workloads
    op.create_table(
        'kubernetes_workloads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('namespace', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('uid', sa.String(), nullable=True),
        sa.Column('desired_replicas', sa.Integer(), nullable=True),
        sa.Column('ready_replicas', sa.Integer(), nullable=True),
        sa.Column('image_references', sa.JSON(), nullable=True),
        sa.Column('service_accounts', sa.JSON(), nullable=True),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('annotations', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='UNKNOWN'),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kubernetes_workloads_cluster_id', 'kubernetes_workloads', ['cluster_id'])
    op.create_index('ix_kubernetes_workloads_uid', 'kubernetes_workloads', ['uid'])

    # kubernetes_pods
    op.create_table(
        'kubernetes_pods',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workload_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('namespace', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('uid', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='UNKNOWN'),
        sa.Column('node', sa.String(), nullable=True),
        sa.Column('containers', sa.JSON(), nullable=True),
        sa.Column('image_digests', sa.JSON(), nullable=True),
        sa.Column('restart_count', sa.Integer(), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('service_account', sa.String(), nullable=True),
        sa.Column('security_context', sa.JSON(), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.ForeignKeyConstraint(['workload_id'], ['kubernetes_workloads.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kubernetes_pods_cluster_id', 'kubernetes_pods', ['cluster_id'])
    op.create_index('ix_kubernetes_pods_uid', 'kubernetes_pods', ['uid'])

    # kubernetes_security_observations
    op.create_table(
        'kubernetes_security_observations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workload_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('namespace', sa.String(), nullable=True),
        sa.Column('resource_kind', sa.String(), nullable=True),
        sa.Column('resource_name', sa.String(), nullable=True),
        sa.Column('check_type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('detail', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='OPEN'),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.ForeignKeyConstraint(['workload_id'], ['kubernetes_workloads.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_k8s_security_observations_cluster_id', 'kubernetes_security_observations', ['cluster_id'])

    # kubernetes_deployments
    op.create_table(
        'kubernetes_deployments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('namespace', sa.String(), nullable=False),
        sa.Column('workload_name', sa.String(), nullable=False),
        sa.Column('workload_kind', sa.String(), nullable=False),
        sa.Column('image_digest', sa.String(), nullable=True),
        sa.Column('manifest_hash', sa.String(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='REQUESTED'),
        sa.Column('policy_decision_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('authorization_context', sa.JSON(), nullable=True),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('requested_by', sa.String(), nullable=True),
        sa.Column('dry_run', sa.Boolean(), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.Column('rollout_evidence', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kubernetes_deployments_project_id', 'kubernetes_deployments', ['project_id'])
    op.create_index('ix_kubernetes_deployments_image_digest', 'kubernetes_deployments', ['image_digest'])

    # jenkins_instances
    op.create_table(
        'jenkins_instances',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('base_url', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('credential_reference', sa.String(), nullable=True),
        sa.Column('version', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_jenkins_instances_project_id', 'jenkins_instances', ['project_id'])

    # jenkins_jobs
    op.create_table(
        'jenkins_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('jenkins_instance_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_name', sa.String(), nullable=False),
        sa.Column('job_path', sa.String(), nullable=True),
        sa.Column('job_type', sa.String(), nullable=True),
        sa.Column('repository', sa.String(), nullable=True),
        sa.Column('branch', sa.String(), nullable=True),
        sa.Column('configuration_reference', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['jenkins_instance_id'], ['jenkins_instances.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_jenkins_jobs_jenkins_instance_id', 'jenkins_jobs', ['jenkins_instance_id'])

    # jenkins_builds
    op.create_table(
        'jenkins_builds',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('build_number', sa.Integer(), nullable=False),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('branch', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='RUNNING'),
        sa.Column('result', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('artifact_reference', sa.String(), nullable=True),
        sa.Column('console_log_reference', sa.String(), nullable=True),
        sa.Column('security_job_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jenkins_jobs.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_jenkins_builds_job_id', 'jenkins_builds', ['job_id'])
    op.create_index('ix_jenkins_builds_commit_sha', 'jenkins_builds', ['commit_sha'])

    # jenkins_webhook_events
    op.create_table(
        'jenkins_webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('delivery_id', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('jenkins_instance_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('job_name', sa.String(), nullable=True),
        sa.Column('build_number', sa.Integer(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payload_hash', sa.String(), nullable=True),
        sa.Column('processing_status', sa.String(), nullable=False, server_default='RECEIVED'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('delivery_id'),
    )
    op.create_index('ix_jenkins_webhook_events_delivery_id', 'jenkins_webhook_events', ['delivery_id'])

    # build_artifacts
    op.create_table(
        'build_artifacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('jenkins_build_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('artifact_type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('digest', sa.String(), nullable=True),
        sa.Column('location_reference', sa.String(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('provenance', sa.JSON(), nullable=True),
        sa.Column('sbom_reference', sa.String(), nullable=True),
        sa.Column('signature_reference', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['jenkins_build_id'], ['jenkins_builds.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_build_artifacts_project_id', 'build_artifacts', ['project_id'])
    op.create_index('ix_build_artifacts_digest', 'build_artifacts', ['digest'])
    op.create_index('ix_build_artifacts_commit_sha', 'build_artifacts', ['commit_sha'])
    op.create_index('ix_build_artifacts_jenkins_build_id', 'build_artifacts', ['jenkins_build_id'])

    # security_deployments
    op.create_table(
        'security_deployments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(), nullable=False),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('artifact_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('image_digest', sa.String(), nullable=True),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('namespace', sa.String(), nullable=True),
        sa.Column('workload_type', sa.String(), nullable=True),
        sa.Column('workload_name', sa.String(), nullable=True),
        sa.Column('environment', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='REQUESTED'),
        sa.Column('policy_decision_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('authorization_context', sa.JSON(), nullable=True),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('requested_by', sa.String(), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['artifact_id'], ['build_artifacts.id']),
        sa.ForeignKeyConstraint(['cluster_id'], ['kubernetes_clusters.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_security_deployments_project_id', 'security_deployments', ['project_id'])
    op.create_index('ix_security_deployments_image_digest', 'security_deployments', ['image_digest'])
    op.create_index('ix_security_deployments_commit_sha', 'security_deployments', ['commit_sha'])
    op.create_index('ix_security_deployments_status', 'security_deployments', ['status'])


def downgrade() -> None:
    op.drop_table('security_deployments')
    op.drop_table('build_artifacts')
    op.drop_table('jenkins_webhook_events')
    op.drop_table('jenkins_builds')
    op.drop_table('jenkins_jobs')
    op.drop_table('jenkins_instances')
    op.drop_table('kubernetes_deployments')
    op.drop_table('kubernetes_security_observations')
    op.drop_table('kubernetes_pods')
    op.drop_table('kubernetes_workloads')
    op.drop_table('kubernetes_namespaces')
    op.drop_table('kubernetes_clusters')
    op.drop_table('container_image_findings')
    op.drop_table('docker_images')
    op.drop_table('container_registries')
